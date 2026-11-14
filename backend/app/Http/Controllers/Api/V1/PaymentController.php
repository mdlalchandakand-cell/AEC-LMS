<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function my(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $payments = $this->paymentQuery()
            ->where('payments.user_id', $request->user()->id)
            ->orderByDesc('payments.submitted_at')
            ->orderByDesc('payments.id')
            ->paginate((int) ($validated['per_page'] ?? 12));

        return $this->response($payments, 'Your payments loaded.');
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!LmsPermission::allows($user, 'payments.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage payments.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,verified,rejected,refunded'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $this->paymentQuery();

        if ($user->role === 'branch_manager') {
            if (!$user->branch_id || !DB::table('branches')
                ->where('id', $user->branch_id)
                ->where('is_active', 1)
                ->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is not assigned to an active branch.',
                    'error' => 'Forbidden.',
                ], 403);
            }

            $query->where('payments.branch_id', $user->branch_id);
        }

        if (isset($validated['status'])) {
            $query->where('payments.status', $validated['status']);
        }

        $payments = $query
            ->orderByDesc('payments.submitted_at')
            ->orderByDesc('payments.id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        return $this->response($payments, 'Payments loaded.');
    }

    public function store(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return response()->json([
                'success' => false,
                'message' => 'Only students can submit their own course payments.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'amount' => ['required'],
            'method' => ['required', 'in:bKash,Nagad,Bank Transfer'],
            'trx_id' => ['required', 'string', 'max:120'],
            'sender_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);

        $amountRaw = trim((string) $validated['amount']);
        if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $amountRaw)) {
            return response()->json([
                'success' => false,
                'message' => 'Amount must be a valid positive BDT amount with up to two decimal places.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $amountCents = $this->moneyToCents($amountRaw);
        if ($amountCents <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount must be greater than zero.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $trxId = trim($validated['trx_id']);
        if ($trxId === '') {
            return response()->json([
                'success' => false,
                'message' => 'A valid transaction reference is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $senderPhone = trim((string) ($validated['sender_phone'] ?? ''));

        try {
            $result = DB::transaction(function () use ($student, $validated, $amountCents, $amountRaw, $trxId, $senderPhone): array {
                $course = DB::table('courses')
                    ->where('id', $validated['course_id'])
                    ->where('status', 'published')
                    ->whereNull('deleted_at')
                    ->lockForUpdate()
                    ->first();

                if (!$course) {
                    return ['error' => 'not_found'];
                }

                if ($course->branch_id !== null && (int) $course->branch_id !== (int) ($student->branch_id ?? 0)) {
                    return ['error' => 'branch_forbidden'];
                }

                $paymentBranchId = $student->branch_id !== null
                    ? (int) $student->branch_id
                    : ($course->branch_id !== null ? (int) $course->branch_id : null);

                if ($paymentBranchId !== null && !DB::table('branches')
                    ->where('id', $paymentBranchId)
                    ->where('is_active', 1)
                    ->exists()) {
                    return ['error' => 'inactive_branch'];
                }

                $refunds = DB::table('payment_refunds')
                    ->select('payment_id')
                    ->selectRaw('SUM(amount) AS refunded_amount')
                    ->where('status', 'completed')
                    ->groupBy('payment_id');

                $priorPayments = DB::table('course_payments as payments')
                    ->leftJoinSub($refunds, 'refunds', function ($join): void {
                        $join->on('refunds.payment_id', '=', 'payments.id');
                    })
                    ->where('payments.user_id', $student->id)
                    ->where('payments.course_id', $course->id)
                    ->whereIn('payments.status', ['pending', 'verified', 'refunded'])
                    ->select('payments.amount')
                    ->selectRaw('COALESCE(refunds.refunded_amount, 0) AS refunded_amount')
                    ->lockForUpdate()
                    ->get();

                $committedCents = 0;
                foreach ($priorPayments as $priorPayment) {
                    $gross = $this->moneyToCents((string) $priorPayment->amount);
                    $refunded = $this->moneyToCents((string) $priorPayment->refunded_amount);
                    $committedCents += max(0, $gross - $refunded);
                }

                $courseFeeCents = $this->moneyToCents((string) $course->price);
                $remainingCents = max(0, $courseFeeCents - $committedCents);
                if ($amountCents > $remainingCents) {
                    return ['error' => 'amount_exceeded', 'remaining_amount' => $this->centsToMoney($remainingCents)];
                }

                $paymentId = (int) DB::table('course_payments')->insertGetId([
                    'user_id' => (int) $student->id,
                    'course_id' => (int) $course->id,
                    'branch_id' => $paymentBranchId,
                    'amount' => $this->centsToMoney($amountCents),
                    'currency' => 'BDT',
                    'payment_method' => $validated['method'],
                    'trx_id' => $trxId,
                    'sender_phone' => $senderPhone !== '' ? $senderPhone : null,
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]);

                return [
                    'id' => $paymentId,
                    'remaining_amount' => $this->centsToMoney(max(0, $remainingCents - $amountCents)),
                ];
            });
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json([
                    'success' => false,
                    'message' => 'This transaction reference has already been submitted.',
                    'error' => 'Conflict.',
                ], 409);
            }

            throw $exception;
        }

        if (isset($result['error'])) {
            [$status, $message] = match ($result['error']) {
                'not_found' => [404, 'Published course not found.'],
                'branch_forbidden' => [403, 'This course is not available to your assigned branch.'],
                'inactive_branch' => [409, 'Payments are closed for this inactive branch.'],
                'amount_exceeded' => [422, 'Payment exceeds the remaining course fee.'],
                default => [422, 'Payment could not be submitted.'],
            };

            return response()->json([
                'success' => false,
                'message' => $message,
                'error' => 'Payment submission failed.',
                'data' => isset($result['remaining_amount'])
                    ? ['remaining_amount' => $result['remaining_amount']]
                    : null,
            ], $status);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment submitted for manual verification.',
            'data' => $result,
        ], 201);
    }

    private function moneyToCents(string $amount): int
    {
        if (!preg_match('/^(\\d+)(?:\\.(\\d{1,2}))?$/', $amount, $matches)) {
            return 0;
        }

        return ((int) $matches[1] * 100) + (int) str_pad($matches[2] ?? '', 2, '0');
    }

    private function centsToMoney(int $cents): string
    {
        return intdiv($cents, 100) . '.' . str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    private function paymentQuery(): Builder
    {
        $refunds = DB::table('payment_refunds')
            ->select('payment_id')
            ->selectRaw('SUM(amount) AS refunded_amount')
            ->where('status', 'completed')
            ->groupBy('payment_id');

        return DB::table('course_payments as payments')
            ->join('users as students', 'students.id', '=', 'payments.user_id')
            ->join('courses', 'courses.id', '=', 'payments.course_id')
            ->leftJoinSub($refunds, 'refunds', function ($join): void {
                $join->on('refunds.payment_id', '=', 'payments.id');
            })
            ->leftJoin('users as reviewers', 'reviewers.id', '=', 'payments.reviewed_by')
            ->select([
                'payments.id',
                'payments.user_id',
                'students.name as student_name',
                'students.email as student_email',
                'payments.course_id',
                'courses.title as course_title',
                'payments.branch_id',
                'payments.amount',
                'payments.currency',
                'payments.payment_method',
                'payments.trx_id',
                'payments.sender_phone',
                'payments.status',
                'payments.submitted_at',
                'payments.reviewed_at',
                'payments.rejection_reason',
                'reviewers.name as reviewed_by_name',
            ])
            ->selectRaw('COALESCE(refunds.refunded_amount, 0) AS refunded_amount');
    }

    private function decimalAmount(mixed $value): string
    {
        $amount = trim((string) $value);
        if (!preg_match('/^(\\d+)(?:\\.(\\d+))?$/', $amount, $matches)) {
            return '0.00';
        }

        return $matches[1] . '.' . str_pad(substr($matches[2] ?? '', 0, 2), 2, '0');
    }

    private function response($paginator, string $message): JsonResponse
    {
        $items = collect($paginator->items())->map(function ($item): object {
            $item->amount = $this->decimalAmount($item->amount);
            $item->refunded_amount = $this->decimalAmount($item->refunded_amount);

            return $item;
        })->values();

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'items' => $items,
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
        ]);
    }
}
