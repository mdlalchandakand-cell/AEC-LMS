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
        $payments = $this->paymentQuery()
            ->where('payments.user_id', $request->user()->id)
            ->orderByDesc('payments.submitted_at')
            ->orderByDesc('payments.id')
            ->paginate((int) $request->input('per_page', 12));

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
            if (!$user->branch_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is not assigned to a branch.',
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

    private function response($paginator, string $message): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'items' => $paginator->items(),
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
