<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        if (!$this->canView($request)) {
            return $this->forbidden('You do not have permission to view expenses.');
        }

        $items = DB::table('expense_categories')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'name_bn', 'code']);

        return response()->json(['success' => true, 'message' => 'Expense categories loaded.', 'data' => ['items' => $items]]);
    }

    public function index(Request $request): JsonResponse
    {
        if (!$this->canView($request)) {
            return $this->forbidden('You do not have permission to view expenses.');
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,approved,rejected,paid'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $this->scopedQuery($request);
        if (isset($validated['status'])) $query->where('expenses.status', $validated['status']);
        if (isset($validated['category_id'])) $query->where('expenses.category_id', $validated['category_id']);
        if (isset($validated['from'])) $query->whereDate('expenses.expense_date', '>=', $validated['from']);
        if (isset($validated['to'])) $query->whereDate('expenses.expense_date', '<=', $validated['to']);

        $items = $query->orderByDesc('expenses.expense_date')
            ->orderByDesc('expenses.id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        return response()->json(['success' => true, 'message' => 'Expenses loaded.', 'data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'expenses.manage')) {
            return $this->forbidden('You do not have permission to create expenses.');
        }

        $validated = $request->validate([
            'category_id' => ['required', 'integer', 'min:1'],
            'branch_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'title' => ['required', 'string', 'min:2', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'expense_date' => ['required', 'date_format:Y-m-d'],
            'vendor' => ['sometimes', 'nullable', 'string', 'max:160'],
            'payment_method' => ['required', 'in:Cash,Bank Transfer,bKash,Nagad,Card,Other'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $category = DB::table('expense_categories')
            ->where('id', $validated['category_id'])
            ->where('is_active', 1)
            ->first();
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Active expense category not found.', 'error' => 'Not found.'], 404);
        }

        $branchId = $actor->role === 'branch_manager'
            ? (int) ($actor->branch_id ?? 0)
            : (isset($validated['branch_id']) ? (int) $validated['branch_id'] : ($actor->branch_id ? (int) $actor->branch_id : null));

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($branchId)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }
        if ($branchId !== null && !$this->hasActiveBranch($branchId)) {
            return response()->json(['success' => false, 'message' => 'An active branch is required.', 'error' => 'Validation failed.'], 422);
        }

        $id = DB::transaction(function () use ($actor, $validated, $branchId, $request): int {
            $id = (int) DB::table('expenses')->insertGetId([
                'category_id' => (int) $validated['category_id'],
                'branch_id' => $branchId,
                'title' => trim($validated['title']),
                'description' => isset($validated['description']) ? trim($validated['description']) : null,
                'amount' => number_format((float) $validated['amount'], 2, '.', ''),
                'currency' => 'BDT',
                'expense_date' => $validated['expense_date'],
                'vendor' => isset($validated['vendor']) ? trim($validated['vendor']) : null,
                'payment_method' => $validated['payment_method'],
                'reference' => isset($validated['reference']) ? trim($validated['reference']) : null,
                'status' => 'pending',
                'created_by' => (int) $actor->id,
                'created_at' => now(),
            ]);
            $this->audit((int) $actor->id, 'expense.created', $id, [
                'branch_id' => $branchId,
                'amount' => number_format((float) $validated['amount'], 2, '.', ''),
            ], $request);
            return $id;
        });

        return response()->json(['success' => true, 'message' => 'Expense submitted for approval.', 'data' => ['id' => $id, 'status' => 'pending']], 201);
    }

    public function update(Request $request, int $expense): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'expenses.manage')) {
            return $this->forbidden('You do not have permission to update expenses.');
        }
        $validated = $request->validate([
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'title' => ['sometimes', 'string', 'min:2', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'amount' => ['sometimes', 'numeric', 'gt:0', 'max:9999999999.99'],
            'expense_date' => ['sometimes', 'date_format:Y-m-d'],
            'vendor' => ['sometimes', 'nullable', 'string', 'max:160'],
            'payment_method' => ['sometimes', 'in:Cash,Bank Transfer,bKash,Nagad,Card,Other'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);
        if ($validated === []) {
            return response()->json(['success' => false, 'message' => 'At least one field is required.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $expense, $validated): ?string {
            $row = $this->scopedQuery($request)->where('expenses.id', $expense)->lockForUpdate()->first();
            if (!$row) return 'not_found';
            if ($row->status !== 'pending') return 'locked';
            if (isset($validated['category_id']) && !DB::table('expense_categories')->where('id', $validated['category_id'])->where('is_active', 1)->exists()) return 'category';
            $changes = $validated;
            foreach (['title', 'description', 'vendor', 'reference'] as $field) {
                if (isset($changes[$field]) && is_string($changes[$field])) $changes[$field] = trim($changes[$field]);
            }
            if (isset($changes['amount'])) $changes['amount'] = number_format((float) $changes['amount'], 2, '.', '');
            $changes['updated_at'] = now();
            DB::table('expenses')->where('id', $expense)->update($changes);
            $this->audit((int) $actor->id, 'expense.updated', $expense, ['fields' => array_keys($validated)], $request);
            return null;
        });

        if ($result === 'not_found') return response()->json(['success' => false, 'message' => 'Expense not found.', 'error' => 'Not found.'], 404);
        if ($result === 'locked') return response()->json(['success' => false, 'message' => 'Only pending expenses can be edited.', 'error' => 'Conflict.'], 409);
        if ($result === 'category') return response()->json(['success' => false, 'message' => 'Active expense category not found.', 'error' => 'Not found.'], 404);
        return response()->json(['success' => true, 'message' => 'Expense updated.', 'data' => ['id' => $expense]]);
    }

    public function review(Request $request, int $expense): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'expenses.approve')) {
            return $this->forbidden('You do not have permission to approve expenses.');
        }
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:500'],
        ]);

        $result = DB::transaction(function () use ($request, $actor, $expense, $validated): ?string {
            $row = $this->scopedQuery($request)->where('expenses.id', $expense)->lockForUpdate()->first();
            if (!$row) return 'not_found';
            if ($row->status !== 'pending') return 'locked';
            DB::table('expenses')->where('id', $expense)->update([
                'status' => $validated['decision'],
                'rejection_reason' => $validated['decision'] === 'rejected' ? trim((string) $validated['reason']) : null,
                'approved_by' => (int) $actor->id,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit((int) $actor->id, 'expense.' . $validated['decision'], $expense, ['reason' => $validated['reason'] ?? null], $request);
            return null;
        });
        if ($result === 'not_found') return response()->json(['success' => false, 'message' => 'Expense not found.', 'error' => 'Not found.'], 404);
        if ($result === 'locked') return response()->json(['success' => false, 'message' => 'Only pending expenses can be reviewed.', 'error' => 'Conflict.'], 409);
        return response()->json(['success' => true, 'message' => 'Expense ' . $validated['decision'] . '.', 'data' => ['id' => $expense, 'status' => $validated['decision']]]);
    }

    public function markPaid(Request $request, int $expense): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'expenses.pay')) {
            return $this->forbidden('You do not have permission to record expense payments.');
        }
        $validated = $request->validate([
            'paid_reference' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $result = DB::transaction(function () use ($request, $actor, $expense, $validated): ?string {
            $row = $this->scopedQuery($request)->where('expenses.id', $expense)->lockForUpdate()->first();
            if (!$row) return 'not_found';
            if ($row->status !== 'approved') return 'locked';
            $reference = isset($validated['paid_reference']) ? trim($validated['paid_reference']) : null;
            if ($row->payment_method !== 'Cash' && ($reference === null || $reference === '')) return 'reference';
            DB::table('expenses')->where('id', $expense)->update([
                'status' => 'paid',
                'paid_reference' => $reference !== '' ? $reference : null,
                'paid_by' => (int) $actor->id,
                'paid_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit((int) $actor->id, 'expense.paid', $expense, ['paid_reference' => $reference], $request);
            return null;
        });
        if ($result === 'not_found') return response()->json(['success' => false, 'message' => 'Expense not found.', 'error' => 'Not found.'], 404);
        if ($result === 'locked') return response()->json(['success' => false, 'message' => 'Only approved expenses can be marked as paid.', 'error' => 'Conflict.'], 409);
        if ($result === 'reference') return response()->json(['success' => false, 'message' => 'A payment reference is required for non-cash payments.', 'error' => 'Validation failed.'], 422);
        return response()->json(['success' => true, 'message' => 'Expense payment recorded.', 'data' => ['id' => $expense, 'status' => 'paid']]);
    }

    public function destroy(Request $request, int $expense): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'expenses.manage')) {
            return $this->forbidden('You do not have permission to delete expenses.');
        }
        $result = DB::transaction(function () use ($request, $actor, $expense): ?string {
            $row = $this->scopedQuery($request)->where('expenses.id', $expense)->lockForUpdate()->first();
            if (!$row) return 'not_found';
            if ($row->status !== 'pending') return 'locked';
            DB::table('expenses')->where('id', $expense)->update(['deleted_at' => now(), 'updated_at' => now()]);
            $this->audit((int) $actor->id, 'expense.deleted', $expense, [], $request);
            return null;
        });
        if ($result === 'not_found') return response()->json(['success' => false, 'message' => 'Expense not found.', 'error' => 'Not found.'], 404);
        if ($result === 'locked') return response()->json(['success' => false, 'message' => 'Only pending expenses can be deleted.', 'error' => 'Conflict.'], 409);
        return response()->json(['success' => true, 'message' => 'Expense deleted.', 'data' => ['id' => $expense]]);
    }

    private function scopedQuery(Request $request): \Illuminate\Database\Query\Builder
    {
        $query = DB::table('expenses')
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.category_id')
            ->leftJoin('branches', 'branches.id', '=', 'expenses.branch_id')
            ->leftJoin('users as creators', 'creators.id', '=', 'expenses.created_by')
            ->leftJoin('users as approvers', 'approvers.id', '=', 'expenses.approved_by')
            ->leftJoin('users as payers', 'payers.id', '=', 'expenses.paid_by')
            ->whereNull('expenses.deleted_at')
            ->select([
                'expenses.id', 'expenses.category_id', 'expense_categories.name as category_name',
                'expense_categories.name_bn as category_name_bn', 'expenses.branch_id',
                'branches.name as branch_name', 'expenses.title', 'expenses.description',
                'expenses.amount', 'expenses.currency', 'expenses.expense_date', 'expenses.vendor',
                'expenses.payment_method', 'expenses.reference', 'expenses.paid_reference',
                'expenses.status', 'expenses.rejection_reason', 'expenses.created_by',
                'creators.name as created_by_name', 'expenses.approved_by', 'approvers.name as approved_by_name',
                'expenses.approved_at', 'expenses.paid_by', 'payers.name as paid_by_name',
                'expenses.paid_at', 'expenses.created_at', 'expenses.updated_at',
            ]);
        if ($request->user()->role === 'branch_manager') {
            $query->where('expenses.branch_id', (int) ($request->user()->branch_id ?? 0));
        }
        return $query;
    }

    private function canView(Request $request): bool
    {
        $user = $request->user();
        return LmsPermission::allows($user, 'expenses.view') || LmsPermission::allows($user, 'expenses.manage');
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && (int) $branchId > 0 && DB::table('branches')->where('id', $branchId)->where('is_active', 1)->exists();
    }

    private function audit(int $actorId, string $action, int $expenseId, array $metadata, Request $request): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $action,
            'entity_type' => 'expense',
            'entity_id' => $expenseId,
            'ip_address' => substr((string) $request->ip(), 0, 45),
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }
}
