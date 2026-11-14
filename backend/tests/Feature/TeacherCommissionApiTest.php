<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TeacherCommissionApiTest extends TestCase
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
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
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
            $table->string('slug', 200)->unique();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20)->default('pending');
        });

        Schema::create('course_payments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('status', 20);
            $table->dateTime('reviewed_at')->nullable();
        });

        Schema::create('payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payment_id');
            $table->decimal('amount', 12, 2);
            $table->string('status', 20);
        });

        Schema::create('teacher_course_assignments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('teacher_user_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->decimal('commission_percentage', 5, 2)->default(60);
            $table->boolean('is_active')->default(true);
            $table->dateTime('assigned_at');
            $table->dateTime('unassigned_at')->nullable();
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('teacher_payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('teacher_user_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->string('payout_method', 32);
            $table->string('account_reference', 190);
            $table->string('bank_name', 160)->nullable();
            $table->string('bank_branch', 160)->nullable();
            $table->string('remarks', 500)->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('rejection_reason', 500)->nullable();
            $table->string('external_transaction_reference', 120)->nullable()->unique();
            $table->dateTime('requested_at')->useCurrent();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->unsignedBigInteger('paid_by')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 80)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('metadata')->nullable();
            $table->dateTime('created_at')->useCurrent();
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('recipient_user_id');
            $table->unsignedBigInteger('sender_user_id')->nullable();
            $table->string('title', 180);
            $table->text('message');
            $table->string('type', 20)->default('info');
            $table->string('target_role', 40)->default('all');
            $table->string('action_url', 80)->nullable();
            $table->dateTime('created_at')->useCurrent();
        });
    }

    private function createUser(string $email, string $role, ?int $branchId = null): int
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

    private function createCourse(string $slug, ?int $branchId = null): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => $branchId,
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
        ]);
    }

    private function assign(int $teacherId, int $courseId, string $rate = '50.00', ?int $branchId = null): int
    {
        return (int) DB::table('teacher_course_assignments')->insertGetId([
            'course_id' => $courseId,
            'teacher_user_id' => $teacherId,
            'branch_id' => $branchId,
            'commission_percentage' => $rate,
            'is_active' => 1,
            'assigned_at' => '2026-11-01 00:00:00',
            'created_at' => now(),
        ]);
    }

    private function payment(int $studentId, int $courseId, string $amount, string $status = 'verified', ?int $branchId = null): int
    {
        return (int) DB::table('course_payments')->insertGetId([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'branch_id' => $branchId,
            'amount' => $amount,
            'status' => $status,
            'reviewed_at' => '2026-11-10 12:00:00',
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

    public function test_teacher_summary_calculates_net_revenue_refunds_and_available_balance(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher');
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $this->assign($teacherId, $courseId, '50.00');
        $paymentId = $this->payment($studentId, $courseId, '1000.00');
        DB::table('payment_refunds')->insert([
            'payment_id' => $paymentId,
            'amount' => '200.00',
            'status' => 'completed',
        ]);
        DB::table('teacher_payout_requests')->insert([
            [
                'teacher_user_id' => $teacherId,
                'amount' => '100.00',
                'payout_method' => 'bKash',
                'account_reference' => '01700000000',
                'status' => 'paid',
                'requested_at' => now(),
            ],
            [
                'teacher_user_id' => $teacherId,
                'amount' => '50.00',
                'payout_method' => 'Nagad',
                'account_reference' => '01700000001',
                'status' => 'pending',
                'requested_at' => now(),
            ],
        ]);
        $this->login('teacher@example.test');

        $this->getJson('/api/v1/teacher-commissions/summary')
            ->assertOk()
            ->assertJsonPath('data.commissions.0.total_course_revenue', '800.00')
            ->assertJsonPath('data.commissions.0.gross_commission', '400.00')
            ->assertJsonPath('data.totals.gross_commission', '400.00')
            ->assertJsonPath('data.totals.paid_commission', '100.00')
            ->assertJsonPath('data.totals.reserved_payouts', '50.00')
            ->assertJsonPath('data.totals.available_balance', '250.00');
    }

    public function test_admin_can_assign_teacher_but_combined_commission_cannot_exceed_one_hundred_percent(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher');
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher');
        $courseId = $this->createCourse('ssc-english');
        $this->grant('admin', 'teacher_commissions.manage');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/teacher-commissions/assignments', [
            'course_id' => $courseId,
            'teacher_user_id' => $teacherOne,
            'commission_percentage' => 60,
        ])->assertCreated();

        $this->postJson('/api/v1/teacher-commissions/assignments', [
            'course_id' => $courseId,
            'teacher_user_id' => $teacherTwo,
            'commission_percentage' => 50,
        ])->assertUnprocessable();

        $this->assertSame(1, DB::table('teacher_course_assignments')->where('is_active', 1)->count());
    }

    public function test_teacher_can_request_only_available_commission_balance(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher');
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $this->assign($teacherId, $courseId, '50.00');
        $this->payment($studentId, $courseId, '1000.00');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/teacher-commissions/payouts', [
            'amount' => '400.00',
            'payout_method' => 'bKash',
            'account_reference' => '01700000000',
        ])->assertCreated()
            ->assertJsonPath('data.available_balance', '100.00');

        $this->postJson('/api/v1/teacher-commissions/payouts', [
            'amount' => '200.00',
            'payout_method' => 'Nagad',
            'account_reference' => '01700000001',
        ])->assertUnprocessable()
            ->assertJsonPath('data.available_balance', '100.00');

        $this->assertSame(1, DB::table('teacher_payout_requests')->where('status', 'pending')->count());
    }

    public function test_admin_can_approve_and_mark_teacher_payout_paid_with_external_reference(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $teacherId = $this->createUser('teacher@example.test', 'teacher');
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $this->assign($teacherId, $courseId, '50.00');
        $this->payment($studentId, $courseId, '1000.00');
        $payoutId = (int) DB::table('teacher_payout_requests')->insertGetId([
            'teacher_user_id' => $teacherId,
            'amount' => '400.00',
            'payout_method' => 'bKash',
            'account_reference' => '01700000000',
            'status' => 'pending',
            'requested_at' => now(),
        ]);
        $this->grant('admin', 'teacher_commissions.payouts.manage');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/teacher-commissions/payouts/' . $payoutId . '/review', [
            'decision' => 'approve',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->postJson('/api/v1/teacher-commissions/payouts/' . $payoutId . '/mark-paid', [
            'external_transaction_reference' => 'BKASH-PAYOUT-001',
        ])->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('teacher_payout_requests', [
            'id' => $payoutId,
            'status' => 'paid',
            'reviewed_by' => $adminId,
            'paid_by' => $adminId,
            'external_transaction_reference' => 'BKASH-PAYOUT-001',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $adminId,
            'action' => 'teacher_payout.paid',
            'entity_id' => $payoutId,
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $teacherId,
            'title' => 'Teacher payout sent',
        ]);
    }

    public function test_payout_approval_rechecks_balance_after_a_refund(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $teacherId = $this->createUser('teacher@example.test', 'teacher');
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $this->assign($teacherId, $courseId, '50.00');
        $paymentId = $this->payment($studentId, $courseId, '1000.00');
        $payoutId = (int) DB::table('teacher_payout_requests')->insertGetId([
            'teacher_user_id' => $teacherId,
            'amount' => '400.00',
            'payout_method' => 'bKash',
            'account_reference' => '01700000000',
            'status' => 'pending',
            'requested_at' => now(),
        ]);
        DB::table('payment_refunds')->insert([
            'payment_id' => $paymentId,
            'amount' => '400.00',
            'status' => 'completed',
        ]);
        $this->grant('admin', 'teacher_commissions.payouts.manage');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/teacher-commissions/payouts/' . $payoutId . '/review', [
            'decision' => 'approve',
        ])->assertStatus(409)
            ->assertJsonPath('data.available_balance', '300.00');

        $this->assertDatabaseHas('teacher_payout_requests', [
            'id' => $payoutId,
            'status' => 'pending',
        ]);
    }
}
