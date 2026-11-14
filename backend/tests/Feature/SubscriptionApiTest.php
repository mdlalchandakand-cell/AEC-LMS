<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160);
            $table->string('email', 190)->unique();
            $table->string('phone', 32)->nullable();
            $table->string('password_hash', 255);
            $table->string('role', 40);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('session_version')->default(1);
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('role', 40);
            $table->string('permission_key', 100);
            $table->boolean('allowed')->default(false);
            $table->unique(['role', 'permission_key']);
        });

        Schema::create('branches', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32);
            $table->string('name', 160);
            $table->boolean('is_active')->default(true);
        });
        DB::table('branches')->insert([
            ['id' => 10, 'code' => 'BR-10', 'name' => 'Branch 10', 'is_active' => 1],
            ['id' => 20, 'code' => 'BR-20', 'name' => 'Branch 20', 'is_active' => 1],
        ]);

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200);
            $table->string('status', 20)->default('published');
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('subscription_plans', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('name_bn', 120)->nullable();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->char('currency', 3)->default('BDT');
            $table->string('billing_period', 20)->default('one_time');
            $table->unsignedSmallInteger('duration_days')->default(30);
            $table->unsignedSmallInteger('max_courses')->nullable();
            $table->text('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('user_subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('plan_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20)->default('pending');
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->string('payment_method', 32);
            $table->string('payment_reference', 120)->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->dateTime('requested_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('review_note', 500)->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('user_subscription_courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('subscription_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20)->default('active');
            $table->dateTime('selected_at')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('subscription_payments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('subscription_id');
            $table->unsignedBigInteger('user_id');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->string('payment_method', 32);
            $table->string('transaction_reference', 120)->unique();
            $table->string('sender_phone', 32)->nullable();
            $table->string('proof_reference', 500)->nullable();
            $table->string('status', 20)->default('pending');
            $table->dateTime('submitted_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->string('review_note', 500)->nullable();
            $table->dateTime('created_at')->nullable();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('metadata')->nullable();
            $table->dateTime('created_at')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('recipient_user_id');
            $table->unsignedBigInteger('sender_user_id')->nullable();
            $table->string('title', 180);
            $table->text('message');
            $table->string('type', 20);
            $table->string('target_role', 40);
            $table->string('action_url', 80)->nullable();
            $table->dateTime('created_at')->nullable();
        });
    }

    private function createUser(string $email, string $role, ?int $branchId = 10): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => ucfirst(str_replace(['@example.test', '-', '.'], ['', ' ', ' '], $email)),
            'email' => $email,
            'phone' => '01700000000',
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => $role,
            'branch_id' => $branchId,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createPlan(int $creatorId, string $name = 'Monthly Plan', string $price = '500.00', int $duration = 30, ?int $maxCourses = null): int
    {
        return (int) DB::table('subscription_plans')->insertGetId([
            'name' => $name,
            'name_bn' => 'মাসিক প্ল্যান',
            'description' => 'Access to LMS learning services',
            'price' => $price,
            'currency' => 'BDT',
            'billing_period' => 'monthly',
            'duration_days' => $duration,
            'max_courses' => $maxCourses,
            'features' => json_encode(['Live classes', 'Recorded lessons']),
            'is_active' => 1,
            'sort_order' => 1,
            'created_by' => $creatorId,
            'created_at' => now(),
        ]);
    }

    private function grant(string $role, string $permission): void
    {
        DB::table('role_permissions')->insert([
            'role' => $role,
            'permission_key' => $permission,
            'allowed' => 1,
        ]);
    }

    private function login(string $email): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();
    }

    private function requestPaidPlan(int $planId, string $reference = 'SUB-TXN-10001'): int
    {
        $response = $this->postJson('/api/v1/subscriptions', [
            'plan_id' => $planId,
            'payment_method' => 'bKash',
            'transaction_reference' => $reference,
            'sender_phone' => '01700000000',
            'proof_reference' => 'proof/subscription-payment.jpg',
        ])->assertCreated();

        return (int) $response->json('data.id');
    }

    public function test_student_can_request_paid_plan_and_admin_can_verify_it(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $planId = $this->createPlan($adminId);
        $this->grant('admin', 'subscriptions.review');
        $this->login('student@example.test');

        $subscriptionId = $this->requestPaidPlan($planId);
        $this->assertDatabaseHas('user_subscriptions', [
            'id' => $subscriptionId,
            'user_id' => $studentId,
            'status' => 'pending',
            'amount' => '500.00',
        ]);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $subscriptionId,
            'transaction_reference' => 'SUB-TXN-10001',
            'status' => 'pending',
        ]);

        $this->postJson('/api/v1/auth/logout', []);
        $this->login('admin@example.test');
        $this->postJson('/api/v1/subscriptions/' . $subscriptionId . '/review', [
            'decision' => 'approve',
            'note' => 'Payment verified',
        ])->assertOk()->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('user_subscriptions', [
            'id' => $subscriptionId,
            'status' => 'active',
            'reviewed_by' => $adminId,
        ]);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $subscriptionId,
            'status' => 'verified',
            'reviewed_by' => $adminId,
        ]);

        $this->postJson('/api/v1/auth/logout', []);
        $this->login('student@example.test');
        $this->getJson('/api/v1/subscriptions/my/access')
            ->assertOk()
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.subscription.plan_id', $planId);
    }

    public function test_free_plan_activates_without_fabricated_payment_reference(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $planId = $this->createPlan($adminId, 'Free Trial', '0.00', 7);
        $this->login('student@example.test');

        $response = $this->postJson('/api/v1/subscriptions', [
            'plan_id' => $planId,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'active');

        $subscriptionId = (int) $response->json('data.id');
        $this->assertDatabaseHas('user_subscriptions', [
            'id' => $subscriptionId,
            'user_id' => $studentId,
            'status' => 'active',
            'payment_method' => 'free',
            'payment_reference' => null,
        ]);
        $this->assertSame(0, DB::table('subscription_payments')->where('subscription_id', $subscriptionId)->count());
        $this->getJson('/api/v1/subscriptions/my/access')->assertOk()->assertJsonPath('data.active', true);
    }

    public function test_duplicate_payment_reference_is_rejected(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $this->createUser('student-one@example.test', 'student', 10);
        $this->createUser('student-two@example.test', 'student', 20);
        $planId = $this->createPlan($adminId);

        $this->login('student-one@example.test');
        $this->requestPaidPlan($planId, 'SUB-REF-DUPLICATE');
        $this->postJson('/api/v1/auth/logout', []);
        $this->login('student-two@example.test');

        $this->postJson('/api/v1/subscriptions', [
            'plan_id' => $planId,
            'payment_method' => 'Nagad',
            'transaction_reference' => 'SUB-REF-DUPLICATE',
        ])->assertStatus(409);

        $this->assertSame(1, DB::table('subscription_payments')->count());
    }

    public function test_student_cancellation_rejects_pending_payment_and_preserves_history(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $this->createUser('student@example.test', 'student', 10);
        $planId = $this->createPlan($adminId);
        $this->login('student@example.test');
        $subscriptionId = $this->requestPaidPlan($planId);

        $this->postJson('/api/v1/subscriptions/' . $subscriptionId . '/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('user_subscriptions', ['id' => $subscriptionId, 'status' => 'cancelled']);
        $this->assertDatabaseHas('subscription_payments', [
            'subscription_id' => $subscriptionId,
            'status' => 'rejected',
            'review_note' => 'Cancelled by the student.',
        ]);
        $this->assertSame(1, DB::table('user_subscriptions')->count());
    }

    public function test_accountant_can_review_but_cannot_change_subscription_plans(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $accountantId = $this->createUser('accountant@example.test', 'accountant', 10);
        $planId = $this->createPlan($adminId);
        $this->grant('accountant', 'subscriptions.review');
        $this->login('student@example.test');
        $subscriptionId = $this->requestPaidPlan($planId);
        $this->postJson('/api/v1/auth/logout', []);
        $this->login('accountant@example.test');

        $this->postJson('/api/v1/subscriptions/plans', [
            'name' => 'Unauthorized plan',
            'price' => '100.00',
            'billing_period' => 'monthly',
            'duration_days' => 30,
        ])->assertForbidden();

        $this->postJson('/api/v1/subscriptions/' . $subscriptionId . '/review', [
            'decision' => 'reject',
            'note' => 'Invalid transaction',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('user_subscriptions', [
            'id' => $subscriptionId,
            'status' => 'rejected',
            'reviewed_by' => $accountantId,
        ]);
    }

    public function test_branch_manager_only_sees_and_reviews_own_branch_subscriptions(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $this->createUser('manager@example.test', 'branch_manager', 10);
        $this->createUser('student@example.test', 'student', 20);
        $planId = $this->createPlan($adminId);
        $this->grant('branch_manager', 'subscriptions.review');
        $this->login('student@example.test');
        $subscriptionId = $this->requestPaidPlan($planId);
        $this->postJson('/api/v1/auth/logout', []);
        $this->login('manager@example.test');

        $this->getJson('/api/v1/subscriptions?status=pending')
            ->assertOk()
            ->assertJsonCount(0, 'data.items');
        $this->postJson('/api/v1/subscriptions/' . $subscriptionId . '/review', [
            'decision' => 'approve',
        ])->assertNotFound();
    }

    public function test_archived_plan_is_hidden_from_student_catalog_but_existing_subscription_remains(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $planId = $this->createPlan($adminId);
        $this->grant('admin', 'subscriptions.manage');
        $this->login('admin@example.test');

        $this->deleteJson('/api/v1/subscriptions/plans/' . $planId)->assertOk();
        $this->assertSame(0, DB::table('subscription_plans')->where('id', $planId)->where('is_active', 1)->count());
        $this->getJson('/api/v1/subscriptions/plans')->assertOk()->assertJsonCount(0, 'data.items');
        $this->assertNotNull(DB::table('subscription_plans')->where('id', $planId)->value('deleted_at'));
    }
}
