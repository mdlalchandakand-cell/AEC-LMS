<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherCommissionController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $actor = $request->user();
        $teacherId = null;
        if (in_array($actor->role, ['teacher', 'assistant_teacher'], true)) {
            $teacherId = (int) $actor->id;
        } else {
            if (!LmsPermission::allows($actor, 'teacher_commissions.payouts.manage')) {
                return $this->forbidden('You do not have permission to view teacher commission summaries.');
            }
            $target = $request->integer('teacher_id');
            if ($target > 0) {
                $teacher = DB::table('users')
                    ->where('id', $target)
                    ->whereIn('role', ['teacher', 'assistant_teacher'])
                    ->where('is_active', 1)
                    ->exists();
                if (!$teacher) {
                    return response()->json(['success' => false, 'message' => 'Teacher account not found.', 'error' => 'Not found.'], 404);
                }
                $teacherId = $target;
            }
        }

        $branchId = $actor->role === 'branch_manager' ? $actor->branch_id : null;
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($branchId)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $commissions = $this->commissionRows($teacherId, $branchId);
        $gross = 0;
        foreach ($commissions as $row) {
            $gross += (int) $row['gross_commission_cents'];
        }

        if ($teacherId !== null) {
            $totals = $this->payoutTotals($teacherId);
        } else {
            $totals = $this->payoutTotals(null, $branchId);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teacher commission summary loaded.',
            'data' => [
                'commissions' => array_map(function (array $row): array {
                    unset($row['gross_commission_cents']);
                    return $row;
                }, $commissions),
                'totals' => [
                    'gross_commission' => $this->centsToMoney($gross),
                    'paid_commission' => $this->centsToMoney($totals['paid']),
                    'reserved_payouts' => $this->centsToMoney($totals['reserved']),
                    'available_balance' => $this->centsToMoney(max(0, $gross - $totals['paid'] - $totals['reserved'])),
                    'overpaid_commission' => $this->centsToMoney(max(0, $totals['paid'] - $gross)),
                ],
            ],
        ]);
    }

    public function assignments(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'teacher_commissions.manage')) {
            return $this->forbidden('You do not have permission to manage teacher assignments.');
        }

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $query = DB::table('teacher_course_assignments as assignments')
            ->join('courses', 'courses.id', '=', 'assignments.course_id')
            ->join('users as teachers', 'teachers.id', '=', 'assignments.teacher_user_id')
            ->select([
                'assignments.id',
                'assignments.course_id',
                'courses.title as course_title',
                'assignments.teacher_user_id',
                'teachers.name as teacher_name',
                'assignments.branch_id',
                'assignments.commission_percentage',
                'assignments.is_active',
                'assignments.assigned_at',
                'assignments.unassigned_at',
            ]);

        if ($actor->role === 'branch_manager') {
            $query->where('assignments.branch_id', $actor->branch_id);
        }

        $items = $query->orderBy('courses.title')->orderBy('teachers.name')->get();

        return response()->json(['success' => true, 'message' => 'Teacher assignments loaded.', 'data' => ['items' => $items]]);
    }

    public function assign(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'teacher_commissions.manage')) {
            return $this->forbidden('You do not have permission to manage teacher assignments.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'teacher_user_id' => ['required', 'integer', 'min:1'],
            'commission_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $rate = number_format((float) $validated['commission_percentage'], 2, '.', '');
        $result = DB::transaction(function () use ($actor, $validated, $rate): array|JsonResponse {
            $course = DB::table('courses')->where('id', $validated['course_id'])->lockForUpdate()->first();
            $teacher = DB::table('users')->where('id', $validated['teacher_user_id'])->lockForUpdate()->first();

            if (!$course || $course->deleted_at !== null) {
                return response()->json(['success' => false, 'message' => 'Course not found.', 'error' => 'Not found.'], 404);
            }
            if (!$teacher || !$teacher->is_active || !in_array($teacher->role, ['teacher', 'assistant_teacher'], true)) {
                return response()->json(['success' => false, 'message' => 'Active teacher account not found.', 'error' => 'Not found.'], 404);
            }
            if ($course->branch_id !== null && $teacher->branch_id !== null
                && (int) $course->branch_id !== (int) $teacher->branch_id) {
                return response()->json(['success' => false, 'message' => 'Course and teacher must belong to the same branch.', 'error' => 'Forbidden.'], 403);
            }
            if ($actor->role === 'branch_manager' && (int) $course->branch_id !== (int) $actor->branch_id) {
                return response()->json(['success' => false, 'message' => 'Course is outside your assigned branch.', 'error' => 'Forbidden.'], 403);
            }

            $branchId = $course->branch_id !== null
                ? (int) $course->branch_id
                : ($teacher->branch_id !== null ? (int) $teacher->branch_id : null);
            if ($branchId !== null && !$this->hasActiveBranch($branchId)) {
                return response()->json(['success' => false, 'message' => 'An active branch is required.', 'error' => 'Validation failed.'], 422);
            }

            $otherRates = DB::table('teacher_course_assignments')
                ->where('course_id', $course->id)
                ->where('is_active', 1)
                ->where('teacher_user_id', '<>', $teacher->id)
                ->sum('commission_percentage');

            if (((float) $otherRates + (float) $rate) > 100.0001) {
                return response()->json(['success' => false, 'message' => 'Combined teacher commission rates for a course cannot exceed 100%.', 'error' => 'Validation failed.'], 422);
            }

            DB::table('teacher_course_assignments')
                ->where('course_id', $course->id)
                ->where('teacher_user_id', $teacher->id)
                ->where('is_active', 1)
                ->update(['is_active' => 0, 'unassigned_at' => now(), 'updated_at' => now()]);

            $id = (int) DB::table('teacher_course_assignments')->insertGetId([
                'course_id' => (int) $course->id,
                'teacher_user_id' => (int) $teacher->id,
                'branch_id' => $branchId,
                'commission_percentage' => $rate,
                'is_active' => 1,
                'assigned_at' => now(),
                'assigned_by' => (int) $actor->id,
                'created_at' => now(),
            ]);

            $this->audit($actor->id, 'teacher_commission.assigned', $id, [
                'course_id' => (int) $course->id,
                'teacher_user_id' => (int) $teacher->id,
                'commission_percentage' => $rate,
            ]);

            return ['id' => $id];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Teacher assigned to course.', 'data' => $result], 201);
    }

    public function unassign(Request $request, int $assignment): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'teacher_commissions.manage')) {
            return $this->forbidden('You do not have permission to manage teacher assignments.');
        }

        $query = DB::table('teacher_course_assignments')
            ->where('id', $assignment)
            ->where('is_active', 1);
        if ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id)) {
                return $this->forbidden('Your account is not assigned to an active branch.');
            }
            $query->where('branch_id', $actor->branch_id);
        }

        $row = $query->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Active assignment not found.', 'error' => 'Not found.'], 404);
        }

        DB::table('teacher_course_assignments')->where('id', $assignment)->update([
            'is_active' => 0,
            'unassigned_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit($actor->id, 'teacher_commission.unassigned', $assignment, []);

        return response()->json([
            'success' => true,
            'message' => 'Teacher assignment disabled. Historical commission records remain.',
            'data' => ['id' => $assignment],
        ]);
    }

    public function payouts(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = DB::table('teacher_payout_requests as payouts')
            ->join('users as teachers', 'teachers.id', '=', 'payouts.teacher_user_id')
            ->select([
                'payouts.id',
                'payouts.teacher_user_id',
                'teachers.name as teacher_name',
                'payouts.amount',
                'payouts.currency',
                'payouts.payout_method',
                'payouts.account_reference',
                'payouts.bank_name',
                'payouts.bank_branch',
                'payouts.remarks',
                'payouts.status',
                'payouts.rejection_reason',
                'payouts.external_transaction_reference',
                'payouts.requested_at',
                'payouts.reviewed_at',
                'payouts.paid_at',
            ]);

        if (in_array($actor->role, ['teacher', 'assistant_teacher'], true)) {
            $query->where('payouts.teacher_user_id', $actor->id);
        } elseif (LmsPermission::allows($actor, 'teacher_commissions.payouts.manage')) {
            if ($actor->role === 'branch_manager') {
                if (!$this->hasActiveBranch($actor->branch_id)) {
                    return $this->forbidden('Your account is not assigned to an active branch.');
                }
                $query->where('payouts.branch_id', $actor->branch_id);
            }
        } else {
            return $this->forbidden('You do not have permission to view payout requests.');
        }

        $items = $query->orderByDesc('payouts.requested_at')->limit(200)->get();

        return response()->json(['success' => true, 'message' => 'Teacher payouts loaded.', 'data' => ['items' => $items]]);
    }

    public function requestPayout(Request $request): JsonResponse
    {
        $teacher = $request->user();
        if (!in_array($teacher->role, ['teacher', 'assistant_teacher'], true)) {
            return $this->forbidden('Only teachers can request commission payouts.');
        }

        $validated = $request->validate([
            'amount' => ['required'],
            'payout_method' => ['required', 'in:bKash,Nagad,Bank Transfer'],
            'account_reference' => ['required', 'string', 'max:190'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'bank_branch' => ['sometimes', 'nullable', 'string', 'max:160'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (!is_string($validated['amount']) && !is_int($validated['amount']) && !is_float($validated['amount'])) {
            return response()->json(['success' => false, 'message' => 'Enter a positive payout amount with up to two decimal places.', 'error' => 'Validation failed.'], 422);
        }
        $amountRaw = trim((string) $validated['amount']);
        if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $amountRaw)) {
            return response()->json(['success' => false, 'message' => 'Enter a positive payout amount with up to two decimal places.', 'error' => 'Validation failed.'], 422);
        }
        $amountCents = $this->moneyToCents($amountRaw);
        $method = $validated['payout_method'];
        $account = trim($validated['account_reference']);
        $bankName = trim((string) ($validated['bank_name'] ?? ''));
        $bankBranch = trim((string) ($validated['bank_branch'] ?? ''));
        $remarks = trim((string) ($validated['remarks'] ?? ''));

        if ($amountCents <= 0 || $account === '') {
            return response()->json(['success' => false, 'message' => 'A positive amount and valid payout account reference are required.', 'error' => 'Validation failed.'], 422);
        }
        if ($method === 'Bank Transfer' && ($bankName === '' || $bankBranch === '')) {
            return response()->json(['success' => false, 'message' => 'Bank name and branch are required for bank transfers.', 'error' => 'Validation failed.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($teacher, $amountCents, $method, $account, $bankName, $bankBranch, $remarks): array|JsonResponse {
                $lockedTeacher = DB::table('users')
                    ->where('id', $teacher->id)
                    ->where('is_active', 1)
                    ->lockForUpdate()
                    ->first(['id', 'branch_id']);

                if (!$lockedTeacher) {
                    return response()->json(['success' => false, 'message' => 'Teacher account is unavailable.', 'error' => 'Not found.'], 404);
                }

                $this->lockRevenueRows((int) $teacher->id);
                $gross = $this->grossCommissionCents((int) $teacher->id);
                $totals = $this->payoutTotals((int) $teacher->id);
                $available = max(0, $gross - $totals['paid'] - $totals['reserved']);
                if ($amountCents > $available) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payout amount exceeds your available commission balance.',
                        'error' => 'Validation failed.',
                        'data' => ['available_balance' => $this->centsToMoney($available)],
                    ], 422);
                }

                $id = (int) DB::table('teacher_payout_requests')->insertGetId([
                    'teacher_user_id' => (int) $teacher->id,
                    'branch_id' => $lockedTeacher->branch_id,
                    'amount' => $this->centsToMoney($amountCents),
                    'currency' => 'BDT',
                    'payout_method' => $method,
                    'account_reference' => $account,
                    'bank_name' => $bankName !== '' ? $bankName : null,
                    'bank_branch' => $bankBranch !== '' ? $bankBranch : null,
                    'remarks' => $remarks !== '' ? $remarks : null,
                    'status' => 'pending',
                    'requested_at' => now(),
                    'created_at' => now(),
                ]);

                $this->audit($teacher->id, 'teacher_payout.requested', $id, [
                    'amount' => $this->centsToMoney($amountCents),
                    'method' => $method,
                ]);

                return [
                    'id' => $id,
                    'status' => 'pending',
                    'available_balance' => $this->centsToMoney($available - $amountCents),
                ];
            });
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['success' => false, 'message' => 'Payout request could not be submitted.', 'error' => 'Payout failed.'], 500);
        }

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Payout request submitted.', 'data' => $result], 201);
    }

    public function reviewPayout(Request $request, int $payout): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'teacher_commissions.payouts.manage')) {
            return $this->forbidden('You do not have permission to review payouts.');
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
        $reason = trim((string) ($validated['reason'] ?? ''));
        if ($validated['decision'] === 'reject' && $reason === '') {
            return response()->json(['success' => false, 'message' => 'A rejection reason is required.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $payout, $validated, $reason): array|JsonResponse {
            $row = DB::table('teacher_payout_requests')->where('id', $payout)->lockForUpdate()->first();
            if (!$row || ($actor->role === 'branch_manager' && (int) $row->branch_id !== (int) $actor->branch_id)) {
                return response()->json(['success' => false, 'message' => 'Payout request not found.', 'error' => 'Not found.'], 404);
            }
            if ($row->status !== 'pending') {
                return response()->json(['success' => false, 'message' => 'Only pending payout requests can be reviewed.', 'error' => 'Conflict.'], 409);
            }

            if ($validated['decision'] === 'approve') {
                $teacher = DB::table('users')->where('id', $row->teacher_user_id)->where('is_active', 1)->lockForUpdate()->first(['id']);
                if (!$teacher) {
                    return response()->json(['success' => false, 'message' => 'Teacher account is unavailable.', 'error' => 'Not found.'], 404);
                }

                $this->lockRevenueRows((int) $row->teacher_user_id);
                $gross = $this->grossCommissionCents((int) $row->teacher_user_id);
                $totals = $this->payoutTotals((int) $row->teacher_user_id);
                $amount = $this->moneyToCents((string) $row->amount);
                $otherReserved = max(0, $totals['reserved'] - $amount);
                $available = max(0, $gross - $totals['paid'] - $otherReserved);
                if ($amount <= 0 || $amount > $available) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Commission balance changed; this payout can no longer be approved for the requested amount.',
                        'error' => 'Conflict.',
                        'data' => ['available_balance' => $this->centsToMoney($available)],
                    ], 409);
                }
            }

            $status = $validated['decision'] === 'approve' ? 'approved' : 'rejected';
            DB::table('teacher_payout_requests')->where('id', $payout)->update([
                'status' => $status,
                'rejection_reason' => $status === 'rejected' ? $reason : null,
                'reviewed_by' => (int) $actor->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            $this->audit($actor->id, 'teacher_payout.' . $status, $payout, [
                'teacher_user_id' => (int) $row->teacher_user_id,
            ]);
            $this->notify((int) $row->teacher_user_id, (int) $actor->id, 'Teacher payout update', 'Your payout request has been ' . $status . '.', $status === 'approved' ? 'success' : 'warning');

            return ['id' => $payout, 'status' => $status];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json([
            'success' => true,
            'message' => 'Payout request ' . $result['status'] . '.',
            'data' => $result,
        ]);
    }

    public function markPaid(Request $request, int $payout): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'teacher_commissions.payouts.manage')) {
            return $this->forbidden('You do not have permission to settle payouts.');
        }

        $validated = $request->validate([
            'external_transaction_reference' => ['required', 'string', 'max:120'],
        ]);
        $reference = trim($validated['external_transaction_reference']);
        if ($reference === '') {
            return response()->json(['success' => false, 'message' => 'A valid external transaction reference is required.', 'error' => 'Validation failed.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $actor, $payout, $reference): array|JsonResponse {
                $row = DB::table('teacher_payout_requests')->where('id', $payout)->lockForUpdate()->first();
                if (!$row || ($actor->role === 'branch_manager' && (int) $row->branch_id !== (int) $actor->branch_id)) {
                    return response()->json(['success' => false, 'message' => 'Payout request not found.', 'error' => 'Not found.'], 404);
                }
                if ($row->status !== 'approved') {
                    return response()->json(['success' => false, 'message' => 'Only approved payouts can be marked paid.', 'error' => 'Conflict.'], 409);
                }

                $teacher = DB::table('users')->where('id', $row->teacher_user_id)->where('is_active', 1)->lockForUpdate()->first(['id']);
                if (!$teacher) {
                    return response()->json(['success' => false, 'message' => 'Teacher account is unavailable.', 'error' => 'Not found.'], 404);
                }

                $this->lockRevenueRows((int) $row->teacher_user_id);
                $gross = $this->grossCommissionCents((int) $row->teacher_user_id);
                $totals = $this->payoutTotals((int) $row->teacher_user_id);
                $amount = $this->moneyToCents((string) $row->amount);
                $otherReserved = max(0, $totals['reserved'] - $amount);
                $available = max(0, $gross - $totals['paid'] - $otherReserved);
                if ($amount <= 0 || $amount > $available) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Commission balance changed; this payout cannot be marked paid for the requested amount.',
                        'error' => 'Conflict.',
                        'data' => ['available_balance' => $this->centsToMoney($available)],
                    ], 409);
                }

                DB::table('teacher_payout_requests')->where('id', $payout)->update([
                    'status' => 'paid',
                    'external_transaction_reference' => $reference,
                    'paid_by' => (int) $actor->id,
                    'paid_at' => now(),
                    'updated_at' => now(),
                ]);

                $this->audit($actor->id, 'teacher_payout.paid', $payout, [
                    'teacher_user_id' => (int) $row->teacher_user_id,
                    'external_transaction_reference' => $reference,
                ]);
                $this->notify((int) $row->teacher_user_id, (int) $actor->id, 'Teacher payout sent', 'Your approved commission payout has been marked as paid.', 'success');

                return ['id' => $payout, 'status' => 'paid'];
            });
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json(['success' => false, 'message' => 'This external transaction reference is already recorded.', 'error' => 'Conflict.'], 409);
            }
            report($exception);
            return response()->json(['success' => false, 'message' => 'Payout could not be marked paid.', 'error' => 'Payout failed.'], 500);
        }

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json([
            'success' => true,
            'message' => 'Payout marked as paid. Record the actual provider/bank reference only after the transfer is confirmed.',
            'data' => $result,
        ]);
    }

    private function commissionRows(?int $teacherId, ?int $branchId): array
    {
        $query = DB::table('teacher_course_assignments as assignments')
            ->join('courses', 'courses.id', '=', 'assignments.course_id')
            ->join('users as teachers', 'teachers.id', '=', 'assignments.teacher_user_id')
            ->select([
                'assignments.id',
                'assignments.teacher_user_id',
                'teachers.name as teacher_name',
                'assignments.course_id',
                'courses.title as course_title',
                'assignments.branch_id',
                'assignments.commission_percentage',
                'assignments.assigned_at',
                'assignments.unassigned_at',
            ]);

        if ($teacherId !== null) {
            $query->where('assignments.teacher_user_id', $teacherId);
        }
        if ($branchId !== null) {
            $query->where('assignments.branch_id', $branchId);
        }

        $assignments = $query->orderBy('teachers.name')->orderBy('courses.title')->get();
        $rows = [];

        foreach ($assignments as $assignment) {
            $netRevenue = $this->assignmentNetRevenueCents($assignment);
            $rateBasisPoints = $this->moneyToCents((string) $assignment->commission_percentage);
            $gross = intdiv(($netRevenue * $rateBasisPoints) + 5000, 10000);
            $enrolledQuery = DB::table('course_enrollments')
                ->where('course_id', $assignment->course_id)
                ->whereIn('status', ['active', 'completed']);
            if ($assignment->branch_id !== null) {
                $enrolledQuery->where('branch_id', $assignment->branch_id);
            }

            $rows[] = [
                'id' => (int) $assignment->id,
                'teacher_user_id' => (int) $assignment->teacher_user_id,
                'teacher_name' => $assignment->teacher_name,
                'course_id' => (int) $assignment->course_id,
                'course_title' => $assignment->course_title,
                'commission_percentage' => $assignment->commission_percentage,
                'total_enrolled_students' => (int) $enrolledQuery->count(),
                'total_course_revenue' => $this->centsToMoney($netRevenue),
                'gross_commission' => $this->centsToMoney($gross),
                'gross_commission_cents' => $gross,
            ];
        }

        return $rows;
    }

    private function assignmentNetRevenueCents(object $assignment): int
    {
        $refunds = DB::table('payment_refunds')
            ->select('payment_id')
            ->selectRaw('SUM(amount) AS refunded_amount')
            ->where('status', 'completed')
            ->groupBy('payment_id');

        $query = DB::table('course_payments as payments')
            ->leftJoinSub($refunds, 'refunds', function ($join): void {
                $join->on('refunds.payment_id', '=', 'payments.id');
            })
            ->where('payments.course_id', $assignment->course_id)
            ->whereIn('payments.status', ['verified', 'refunded'])
            ->whereNotNull('payments.reviewed_at')
            ->where('payments.reviewed_at', '>=', $assignment->assigned_at)
            ->select('payments.amount')
            ->selectRaw('COALESCE(refunds.refunded_amount, 0) AS refunded_amount');

        if ($assignment->unassigned_at !== null) {
            $query->where('payments.reviewed_at', '<', $assignment->unassigned_at);
        }
        if ($assignment->branch_id !== null) {
            $query->where('payments.branch_id', $assignment->branch_id);
        }

        $total = 0;
        foreach ($query->get() as $payment) {
            $total += max(0, $this->moneyToCents((string) $payment->amount)
                - $this->moneyToCents((string) $payment->refunded_amount));
        }

        return $total;
    }

    private function grossCommissionCents(int $teacherId): int
    {
        $assignments = DB::table('teacher_course_assignments')
            ->where('teacher_user_id', $teacherId)
            ->get();

        $total = 0;
        foreach ($assignments as $assignment) {
            $revenue = $this->assignmentNetRevenueCents($assignment);
            $rate = $this->moneyToCents((string) $assignment->commission_percentage);
            $total += intdiv(($revenue * $rate) + 5000, 10000);
        }

        return $total;
    }

    private function payoutTotals(?int $teacherId, ?int $branchId = null): array
    {
        $query = DB::table('teacher_payout_requests');
        if ($teacherId !== null) {
            $query->where('teacher_user_id', $teacherId);
        }
        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        $paid = 0;
        $reserved = 0;
        foreach ($query->get(['amount', 'status']) as $payout) {
            $amount = $this->moneyToCents((string) $payout->amount);
            if ($payout->status === 'paid') {
                $paid += $amount;
            } elseif (in_array($payout->status, ['pending', 'approved'], true)) {
                $reserved += $amount;
            }
        }

        return ['paid' => $paid, 'reserved' => $reserved];
    }

    private function lockRevenueRows(int $teacherId): void
    {
        $assignments = DB::table('teacher_course_assignments')
            ->where('teacher_user_id', $teacherId)
            ->lockForUpdate()
            ->get();

        foreach ($assignments as $assignment) {
            $query = DB::table('course_payments as payments')
                ->where('payments.course_id', $assignment->course_id)
                ->whereIn('payments.status', ['verified', 'refunded'])
                ->whereNotNull('payments.reviewed_at')
                ->where('payments.reviewed_at', '>=', $assignment->assigned_at);
            if ($assignment->unassigned_at !== null) {
                $query->where('payments.reviewed_at', '<', $assignment->unassigned_at);
            }
            if ($assignment->branch_id !== null) {
                $query->where('payments.branch_id', $assignment->branch_id);
            }
            $query->orderBy('payments.id')->lockForUpdate()->get(['payments.id']);
        }
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

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }

    private function audit(int $actorId, string $event, int $entityId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => str_starts_with($event, 'teacher_payout.') ? 'teacher_payout_request' : 'teacher_course_assignment',
            'entity_id' => $entityId,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function notify(int $recipientId, int $senderId, string $title, string $message, string $type): void
    {
        DB::table('notifications')->insert([
            'recipient_user_id' => $recipientId,
            'sender_user_id' => $senderId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'target_role' => 'teacher',
            'action_url' => 'teacher_commissions',
            'created_at' => now(),
        ]);
    }
}
