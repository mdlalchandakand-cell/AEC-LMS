<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function plans(): JsonResponse
    {
        $items = DB::table('subscription_plans')
            ->where('is_active', 1)
            ->whereNull('deleted_at')
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();

        $items = $items->map(fn ($row): array => $this->planRow($row))->all();

        return response()->json(['success' => true, 'message' => 'Subscription plans loaded.', 'data' => ['items' => $items]]);
    }

    public function my(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return $this->forbidden('Student account required.');
        }

        DB::table('user_subscriptions')
            ->where('user_id', $student->id)
            ->where('status', 'active')
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now('Asia/Dhaka')->format('Y-m-d H:i:s'))
            ->update(['status' => 'expired', 'updated_at' => now()]);

        $items = DB::table('user_subscriptions as subscriptions')
            ->join('subscription_plans as plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->leftJoin('subscription_payments as payments', 'payments.subscription_id', '=', 'subscriptions.id')
            ->where('subscriptions.user_id', $student->id)
            ->orderByDesc('subscriptions.requested_at')
            ->orderByDesc('subscriptions.id')
            ->limit(100)
            ->get([
                'subscriptions.id',
                'subscriptions.plan_id',
                'plans.name as plan_name',
                'plans.name_bn as plan_name_bn',
                'subscriptions.status',
                'subscriptions.amount',
                'subscriptions.currency',
                'subscriptions.payment_method',
                'subscriptions.payment_reference',
                'subscriptions.starts_at',
                'subscriptions.ends_at',
                'subscriptions.requested_at',
                'subscriptions.cancelled_at',
                'payments.status as payment_status',
                'payments.review_note',
            ]);

        return response()->json(['success' => true, 'message' => 'Your subscriptions loaded.', 'data' => ['items' => $items]]);
    }

    public function access(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return $this->forbidden('Student account required.');
        }

        $subscription = DB::table('user_subscriptions as subscriptions')
            ->join('subscription_plans as plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->where('subscriptions.user_id', $student->id)
            ->where('subscriptions.status', 'active')
            ->where(function ($window): void {
                $window->whereNull('subscriptions.ends_at')
                    ->orWhere('subscriptions.ends_at', '>', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
            })
            ->orderByDesc('subscriptions.ends_at')
            ->first([
                'subscriptions.id',
                'subscriptions.plan_id',
                'subscriptions.starts_at',
                'subscriptions.ends_at',
                'plans.name',
                'plans.name_bn',
                'plans.max_courses',
                'plans.features',
            ]);

        if (!$subscription) {
            return response()->json([
                'success' => true,
                'message' => 'No active subscription.',
                'data' => ['active' => false, 'subscription' => null],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Active subscription found.',
            'data' => [
                'active' => true,
                'subscription' => [
                    'id' => (int) $subscription->id,
                    'plan_id' => (int) $subscription->plan_id,
                    'name' => $subscription->name,
                    'name_bn' => $subscription->name_bn,
                    'starts_at' => $subscription->starts_at,
                    'ends_at' => $subscription->ends_at,
                    'max_courses' => $subscription->max_courses,
                    'features' => $subscription->features ? (json_decode((string) $subscription->features, true) ?: []) : [],
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return $this->forbidden('Only students can subscribe to a plan.');
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'min:1'],
            'payment_method' => ['sometimes', 'nullable', 'in:bKash,Nagad,Card,Internet Banking,Bank Transfer,Cash,Offline'],
            'transaction_reference' => ['sometimes', 'nullable', 'string', 'min:3', 'max:120'],
            'sender_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'proof_reference' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
        try {
            $result = DB::transaction(function () use ($request, $student, $validated): array|JsonResponse {
                $lockedUser = DB::table('users')
                    ->where('id', $student->id)
                    ->where('is_active', 1)
                    ->lockForUpdate()
                    ->first(['id', 'branch_id']);
                if (!$lockedUser) {
                    return response()->json(['success' => false, 'message' => 'Student account is unavailable.', 'error' => 'Not found.'], 404);
                }

                $plan = DB::table('subscription_plans')
                    ->where('id', $validated['plan_id'])
                    ->where('is_active', 1)
                    ->whereNull('deleted_at')
                    ->lockForUpdate()
                    ->first();
                if (!$plan) {
                    return response()->json(['success' => false, 'message' => 'Subscription plan is not available.', 'error' => 'Not found.'], 404);
                }

                $isFree = (float) $plan->price <= 0;
                $paymentMethod = trim((string) ($validated['payment_method'] ?? ''));
                $reference = trim((string) ($validated['transaction_reference'] ?? ''));
                if (!$isFree && ($paymentMethod === '' || $reference === '')) {
                    return response()->json(['success' => false, 'message' => 'Paid plans require a payment method and transaction reference.', 'error' => 'Validation failed.'], 422);
                }
                if ($lockedUser->branch_id !== null && !$this->hasActiveBranch($lockedUser->branch_id)) {
                    return response()->json(['success' => false, 'message' => 'Your assigned branch is inactive. Contact support.', 'error' => 'Forbidden.'], 403);
                }

                $active = DB::table('user_subscriptions')
                    ->where('user_id', $student->id)
                    ->where('status', 'active')
                    ->where(function ($window): void {
                        $window->whereNull('ends_at')
                            ->orWhere('ends_at', '>', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
                    })
                    ->exists();
                if ($active) {
                    return response()->json(['success' => false, 'message' => 'You already have an active subscription.', 'error' => 'Conflict.'], 409);
                }

                $pending = DB::table('user_subscriptions')
                    ->where('user_id', $student->id)
                    ->where('status', 'pending')
                    ->exists();
                if ($pending) {
                    return response()->json(['success' => false, 'message' => 'You already have a pending subscription request.', 'error' => 'Conflict.'], 409);
                }

                if ($isFree) {
                    $startsAt = now('Asia/Dhaka');
                    $endsAt = $startsAt->copy()->addDays(max(1, (int) $plan->duration_days));
                    $subscriptionId = (int) DB::table('user_subscriptions')->insertGetId([
                        'user_id' => (int) $student->id,
                        'plan_id' => (int) $plan->id,
                        'branch_id' => $lockedUser->branch_id,
                        'status' => 'active',
                        'starts_at' => $startsAt,
                        'ends_at' => $endsAt,
                        'amount' => $plan->price,
                        'currency' => $plan->currency,
                        'payment_method' => 'free',
                        'requested_at' => now(),
                        'reviewed_at' => now(),
                        'created_at' => now(),
                    ]);
                    $this->audit($request, (int) $student->id, 'subscription.activated', $subscriptionId, ['plan_id' => (int) $plan->id, 'free_plan' => true]);
                    $this->notify((int) $student->id, (int) $student->id, 'Subscription activated', 'Your free subscription is active until ' . $endsAt->format('Y-m-d H:i:s') . '.', 'success');

                    return [
                        'id' => $subscriptionId,
                        'status' => 'active',
                        'starts_at' => $startsAt->format('Y-m-d H:i:s'),
                        'ends_at' => $endsAt->format('Y-m-d H:i:s'),
                        'amount' => $plan->price,
                        'currency' => $plan->currency,
                    ];
                }

                $subscriptionId = (int) DB::table('user_subscriptions')->insertGetId([
                    'user_id' => (int) $student->id,
                    'plan_id' => (int) $plan->id,
                    'branch_id' => $lockedUser->branch_id,
                    'status' => 'pending',
                    'amount' => $plan->price,
                    'currency' => $plan->currency,
                    'payment_method' => $paymentMethod,
                    'payment_reference' => $reference,
                    'requested_at' => now(),
                    'created_at' => now(),
                ]);

                DB::table('subscription_payments')->insert([
                    'subscription_id' => $subscriptionId,
                    'user_id' => (int) $student->id,
                    'amount' => $plan->price,
                    'currency' => $plan->currency,
                    'payment_method' => $paymentMethod,
                    'transaction_reference' => $reference,
                    'sender_phone' => trim((string) ($validated['sender_phone'] ?? '')) ?: null,
                    'proof_reference' => trim((string) ($validated['proof_reference'] ?? '')) ?: null,
                    'status' => 'pending',
                    'submitted_at' => now(),
                    'created_at' => now(),
                ]);

                $this->audit($request, (int) $student->id, 'subscription.requested', $subscriptionId, [
                    'plan_id' => (int) $plan->id,
                    'payment_method' => $validated['payment_method'],
                ]);

                return ['id' => $subscriptionId, 'status' => 'pending', 'amount' => $plan->price, 'currency' => $plan->currency];
            });
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json(['success' => false, 'message' => 'This payment transaction reference has already been used.', 'error' => 'Conflict.'], 409);
            }
            throw $exception;
        }

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Subscription request submitted for payment verification.', 'data' => $result], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'subscriptions.review')) {
            return $this->forbidden('You do not have permission to manage subscriptions.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $query = DB::table('user_subscriptions as subscriptions')
            ->join('users', 'users.id', '=', 'subscriptions.user_id')
            ->join('subscription_plans as plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->leftJoin('subscription_payments as payments', 'payments.subscription_id', '=', 'subscriptions.id')
            ->select([
                'subscriptions.id',
                'subscriptions.user_id',
                'users.name as student_name',
                'users.email as student_email',
                'subscriptions.plan_id',
                'plans.name as plan_name',
                'subscriptions.branch_id',
                'subscriptions.status',
                'subscriptions.amount',
                'subscriptions.currency',
                'subscriptions.payment_method',
                'subscriptions.payment_reference',
                'subscriptions.starts_at',
                'subscriptions.ends_at',
                'subscriptions.requested_at',
                'payments.status as payment_status',
                'payments.transaction_reference',
                'payments.sender_phone',
                'payments.proof_reference',
            ]);
        if ($actor->role === 'branch_manager') {
            $query->where('subscriptions.branch_id', $actor->branch_id);
        }

        $status = $request->query('status');
        if (is_string($status) && in_array($status, ['pending', 'active', 'expired', 'cancelled', 'rejected'], true)) {
            $query->where('subscriptions.status', $status);
        }

        $items = $query->orderByDesc('subscriptions.requested_at')->limit(500)->get();

        return response()->json(['success' => true, 'message' => 'Subscription requests loaded.', 'data' => ['items' => $items]]);
    }

    public function review(Request $request, int $subscription): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'subscriptions.review')) {
            return $this->forbidden('You do not have permission to review subscriptions.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
        $note = trim((string) ($validated['note'] ?? ''));

        $result = DB::transaction(function () use ($request, $actor, $subscription, $validated, $note): array|JsonResponse {
            $row = DB::table('user_subscriptions')->where('id', $subscription)->lockForUpdate()->first();
            if (!$row || ($actor->role === 'branch_manager' && (int) $row->branch_id !== (int) $actor->branch_id)) {
                return response()->json(['success' => false, 'message' => 'Subscription request not found.', 'error' => 'Not found.'], 404);
            }
            if ($row->status !== 'pending') {
                return response()->json(['success' => false, 'message' => 'Only pending subscription requests can be reviewed.', 'error' => 'Conflict.'], 409);
            }

            $payment = DB::table('subscription_payments')
                ->where('subscription_id', $subscription)
                ->where('status', 'pending')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
            if (!$payment) {
                return response()->json(['success' => false, 'message' => 'Pending subscription payment not found.', 'error' => 'Not found.'], 404);
            }

            $status = $validated['decision'] === 'approve' ? 'active' : 'rejected';
            $startsAt = null;
            $endsAt = null;
            if ($status === 'active') {
                $active = DB::table('user_subscriptions')
                    ->where('user_id', $row->user_id)
                    ->where('status', 'active')
                    ->where(function ($window): void {
                        $window->whereNull('ends_at')
                            ->orWhere('ends_at', '>', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
                    })
                    ->exists();
                if ($active) {
                    return response()->json(['success' => false, 'message' => 'Student already has another active subscription.', 'error' => 'Conflict.'], 409);
                }

                $plan = DB::table('subscription_plans')->where('id', $row->plan_id)->first(['duration_days']);
                if (!$plan) {
                    return response()->json(['success' => false, 'message' => 'Subscription plan not found.', 'error' => 'Not found.'], 404);
                }
                $starts = now('Asia/Dhaka');
                $startsAt = $starts->format('Y-m-d H:i:s');
                $endsAt = $starts->copy()->addDays(max(1, (int) $plan->duration_days))->format('Y-m-d H:i:s');
            }

            DB::table('user_subscriptions')->where('id', $subscription)->update([
                'status' => $status,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'reviewed_by' => (int) $actor->id,
                'reviewed_at' => now(),
                'review_note' => $note !== '' ? $note : null,
                'updated_at' => now(),
            ]);
            DB::table('subscription_payments')->where('id', $payment->id)->update([
                'status' => $status === 'active' ? 'verified' : 'rejected',
                'reviewed_by' => (int) $actor->id,
                'reviewed_at' => now(),
                'review_note' => $note !== '' ? $note : null,
            ]);

            $this->audit($request, (int) $actor->id, 'subscription.' . $status, $subscription, [
                'user_id' => (int) $row->user_id,
                'payment_id' => (int) $payment->id,
            ]);
            $this->notify(
                (int) $row->user_id,
                (int) $actor->id,
                $status === 'active' ? 'Subscription activated' : 'Subscription request rejected',
                $status === 'active' ? 'Your subscription is active until ' . $endsAt . '.' : 'Your subscription request was rejected. ' . $note,
                $status === 'active' ? 'success' : 'warning'
            );

            return ['id' => $subscription, 'status' => $status, 'starts_at' => $startsAt, 'ends_at' => $endsAt];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Subscription request ' . $result['status'] . '.', 'data' => $result]);
    }

    public function cancel(Request $request, int $subscription): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return $this->forbidden('Only students can cancel their own subscriptions.');
        }

        $result = DB::transaction(function () use ($request, $student, $subscription): array|JsonResponse {
            $row = DB::table('user_subscriptions')
                ->where('id', $subscription)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->first();
            if (!$row || !in_array($row->status, ['pending', 'active'], true)) {
                return response()->json(['success' => false, 'message' => 'Pending or active subscription not found.', 'error' => 'Not found.'], 404);
            }

            DB::table('user_subscriptions')->where('id', $subscription)->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('subscription_payments')
                ->where('subscription_id', $subscription)
                ->where('status', 'pending')
                ->update([
                    'status' => 'rejected',
                    'review_note' => 'Cancelled by the student.',
                    'reviewed_at' => now(),
                ]);
            $this->audit($request, (int) $student->id, 'subscription.cancelled', $subscription, []);

            return ['id' => $subscription, 'status' => 'cancelled'];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Subscription cancelled.', 'data' => $result]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'subscriptions.manage')) {
            return $this->forbidden('You do not have permission to manage subscription plans.');
        }
        $payload = $this->validatePlan($request);

        $id = (int) DB::table('subscription_plans')->insertGetId([
            'name' => $payload['name'],
            'name_bn' => $payload['name_bn'],
            'description' => $payload['description'],
            'description_bn' => $payload['description_bn'],
            'price' => $payload['price'],
            'currency' => 'BDT',
            'billing_period' => $payload['billing_period'],
            'duration_days' => $payload['duration_days'],
            'max_courses' => $payload['max_courses'],
            'features' => json_encode($payload['features'], JSON_UNESCAPED_UNICODE),
            'is_active' => $payload['is_active'],
            'sort_order' => $payload['sort_order'],
            'created_by' => (int) $actor->id,
            'created_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'subscription_plan.created', $id, []);

        return response()->json(['success' => true, 'message' => 'Subscription plan created.', 'data' => ['id' => $id]], 201);
    }

    public function updatePlan(Request $request, int $plan): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'subscriptions.manage')) {
            return $this->forbidden('You do not have permission to manage subscription plans.');
        }

        $row = DB::table('subscription_plans')->where('id', $plan)->whereNull('deleted_at')->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Subscription plan not found.', 'error' => 'Not found.'], 404);
        }

        $payload = $this->validatePlan($request);
        DB::table('subscription_plans')->where('id', $plan)->update([
            'name' => $payload['name'],
            'name_bn' => $payload['name_bn'],
            'description' => $payload['description'],
            'description_bn' => $payload['description_bn'],
            'price' => $payload['price'],
            'billing_period' => $payload['billing_period'],
            'duration_days' => $payload['duration_days'],
            'max_courses' => $payload['max_courses'],
            'features' => json_encode($payload['features'], JSON_UNESCAPED_UNICODE),
            'is_active' => $payload['is_active'],
            'sort_order' => $payload['sort_order'],
            'updated_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'subscription_plan.updated', $plan, []);

        return response()->json(['success' => true, 'message' => 'Subscription plan updated.', 'data' => ['id' => $plan]]);
    }

    public function deletePlan(Request $request, int $plan): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'subscriptions.manage')) {
            return $this->forbidden('You do not have permission to manage subscription plans.');
        }

        $updated = DB::table('subscription_plans')->where('id', $plan)->whereNull('deleted_at')->update([
            'is_active' => 0,
            'deleted_at' => now(),
            'updated_at' => now(),
        ]);
        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Subscription plan not found.', 'error' => 'Not found.'], 404);
        }

        $this->audit($request, (int) $actor->id, 'subscription_plan.deleted', $plan, []);

        return response()->json(['success' => true, 'message' => 'Subscription plan archived.', 'data' => ['id' => $plan]]);
    }

    private function validatePlan(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'name_bn' => ['sometimes', 'nullable', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'description_bn' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'price' => ['required'],
            'billing_period' => ['required', 'in:one_time,monthly,yearly,custom'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'max_courses' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000'],
            'features' => ['sometimes', 'array', 'max:50'],
            'features.*' => ['string', 'max:300'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);

        $price = trim((string) $validated['price']);
        if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $price)) {
            return abort(422, 'Plan price must be a non-negative amount with up to two decimal places.');
        }

        return [
            'name' => trim($validated['name']),
            'name_bn' => trim((string) ($validated['name_bn'] ?? '')) ?: null,
            'description' => trim((string) ($validated['description'] ?? '')) ?: null,
            'description_bn' => trim((string) ($validated['description_bn'] ?? '')) ?: null,
            'price' => $price,
            'billing_period' => $validated['billing_period'],
            'duration_days' => (int) $validated['duration_days'],
            'max_courses' => isset($validated['max_courses']) ? (int) $validated['max_courses'] : null,
            'features' => array_values(array_unique(array_map('trim', $validated['features'] ?? []))),
            'is_active' => isset($validated['is_active']) ? (int) (bool) $validated['is_active'] : 1,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ];
    }

    private function planRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'name' => $row->name,
            'name_bn' => $row->name_bn,
            'description' => $row->description,
            'description_bn' => $row->description_bn,
            'price' => $row->price,
            'currency' => $row->currency,
            'billing_period' => $row->billing_period,
            'duration_days' => (int) $row->duration_days,
            'max_courses' => $row->max_courses === null ? null : (int) $row->max_courses,
            'features' => $row->features ? (json_decode((string) $row->features, true) ?: []) : [],
        ];
    }

    private function audit(Request $request, int $actorId, string $event, int $entityId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => str_starts_with($event, 'subscription_plan.') ? 'subscription_plan' : 'user_subscription',
            'entity_id' => $entityId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
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
            'target_role' => 'student',
            'action_url' => 'subscriptions',
            'created_at' => now(),
        ]);
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
}
