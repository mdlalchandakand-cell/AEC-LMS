<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160);
            $table->string('email', 190)->unique();
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
            $table->string('slug', 200)->unique();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('course_payments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->string('payment_method', 32);
            $table->string('trx_id', 120);
            $table->string('sender_phone', 32)->nullable();
            $table->string('status', 20)->default('pending');
            $table->dateTime('submitted_at')->useCurrent();
            $table->dateTime('reviewed_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->unique(['payment_method', 'trx_id']);
        });

        Schema::create('payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payment_id');
            $table->decimal('amount', 12, 2);
            $table->string('status', 20)->default('completed');
        });
    }

    private function createUser(string $email, string $role, ?int $branchId = null): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => ucfirst($role) . ' User',
            'email' => $email,
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => $role,
            'branch_id' => $branchId,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function login(string $email): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();
    }

    private function createPayment(int $studentId, int $courseId, ?int $branchId, string $status, string $trxId): int
    {
        return (int) DB::table('course_payments')->insertGetId([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'branch_id' => $branchId,
            'amount' => '1250.00',
            'currency' => 'BDT',
            'payment_method' => 'bKash',
            'trx_id' => $trxId,
            'status' => $status,
            'submitted_at' => now(),
        ]);
    }

    public function test_student_can_only_see_their_own_payment_history_and_refund_totals(): void
    {
        $studentId = $this->createUser('student-one@example.test', 'student');
        $otherStudentId = $this->createUser('student-two@example.test', 'student');
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'HSC English',
            'slug' => 'hsc-english',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $ownPayment = $this->createPayment($studentId, $courseId, null, 'verified', 'AEC-OWN-001');
        $this->createPayment($otherStudentId, $courseId, null, 'pending', 'AEC-OTHER-001');
        DB::table('payment_refunds')->insert([
            'payment_id' => $ownPayment,
            'amount' => '250.00',
            'status' => 'completed',
        ]);

        $this->login('student-one@example.test');

        $this->getJson('/api/v1/payments/my')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.trx_id', 'AEC-OWN-001')
            ->assertJsonPath('data.items.0.refunded_amount', '250.00')
            ->assertJsonMissing(['trx_id' => 'AEC-OTHER-001']);
    }

    public function test_payment_management_uses_permission_and_branch_scope(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 10);
        $studentOne = $this->createUser('student-one@example.test', 'student', 10);
        $studentTwo = $this->createUser('student-two@example.test', 'student', 20);
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'SSC English',
            'slug' => 'ssc-english',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('role_permissions')->insert([
            'role' => 'branch_manager',
            'permission_key' => 'payments.manage',
            'allowed' => 1,
        ]);

        $this->createPayment($studentOne, $courseId, 10, 'pending', 'AEC-BR10-001');
        $this->createPayment($studentTwo, $courseId, 20, 'verified', 'AEC-BR20-001');

        $this->login('manager@example.test');

        $this->getJson('/api/v1/payments?status=pending')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.trx_id', 'AEC-BR10-001')
            ->assertJsonMissing(['trx_id' => 'AEC-BR20-001']);
    }

    public function test_student_can_submit_manual_payment_with_remaining_fee_calculated(): void
    {
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'HSC English',
            'slug' => 'hsc-english',
            'price' => '1000.00',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->login('student@example.test');

        $this->postJson('/api/v1/payments', [
            'course_id' => $courseId,
            'amount' => '600.00',
            'method' => 'bKash',
            'trx_id' => 'AEC-SUBMIT-001',
            'sender_phone' => '01700000000',
        ])->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.remaining_amount', '400.00');

        $this->assertDatabaseHas('course_payments', [
            'user_id' => $studentId,
            'course_id' => $courseId,
            'amount' => '600.00',
            'payment_method' => 'bKash',
            'trx_id' => 'AEC-SUBMIT-001',
            'status' => 'pending',
        ]);
    }

    public function test_payment_submission_cannot_exceed_remaining_course_fee(): void
    {
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'HSC English',
            'slug' => 'hsc-english',
            'price' => '1500.00',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->createPayment($studentId, $courseId, null, 'pending', 'AEC-PRIOR-001');

        $this->login('student@example.test');

        $this->postJson('/api/v1/payments', [
            'course_id' => $courseId,
            'amount' => '300.00',
            'method' => 'Nagad',
            'trx_id' => 'AEC-OVERPAY-001',
        ])->assertUnprocessable()
            ->assertJsonPath('data.remaining_amount', '250.00');

        $this->assertDatabaseMissing('course_payments', [
            'trx_id' => 'AEC-OVERPAY-001',
        ]);
    }

    public function test_non_student_cannot_submit_a_course_payment(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/payments', [
            'course_id' => 1,
            'amount' => '100.00',
            'method' => 'bKash',
            'trx_id' => 'AEC-ADMIN-001',
        ])->assertForbidden();
    }

    public function test_payment_submission_rejects_inactive_student_branch(): void
    {
        DB::table('branches')->where('id', 10)->update(['is_active' => 0]);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = DB::table('courses')->insertGetId([
            'branch_id' => 10,
            'title' => 'Branch Course',
            'slug' => 'branch-course',
            'price' => '1000.00',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->login('student@example.test');

        $this->postJson('/api/v1/payments', [
            'course_id' => $courseId,
            'amount' => '100.00',
            'method' => 'Bank Transfer',
            'trx_id' => 'AEC-INACTIVE-001',
        ])->assertStatus(409);

        $this->assertDatabaseMissing('course_payments', [
            'user_id' => $studentId,
            'trx_id' => 'AEC-INACTIVE-001',
        ]);
    }

    public function test_payment_transaction_reference_cannot_be_reused_for_same_method(): void
    {
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'HSC English',
            'slug' => 'hsc-english',
            'price' => '1000.00',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->login('student@example.test');
        $payload = [
            'course_id' => $courseId,
            'amount' => '100.00',
            'method' => 'bKash',
            'trx_id' => 'AEC-REUSE-001',
        ];

        $this->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->postJson('/api/v1/payments', $payload)->assertStatus(409);

        $this->assertSame(1, DB::table('course_payments')
            ->where('user_id', $studentId)
            ->where('trx_id', 'AEC-REUSE-001')
            ->count());
    }

    public function test_users_without_payment_management_permission_are_forbidden(): void
    {
        $this->createUser('student@example.test', 'student');
        $this->login('student@example.test');

        $this->getJson('/api/v1/payments')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_payment_filters_and_pagination_are_validated(): void
    {
        $this->createUser('admin@example.test', 'admin');
        DB::table('role_permissions')->insert([
            'role' => 'admin',
            'permission_key' => 'payments.manage',
            'allowed' => 1,
        ]);
        $this->login('admin@example.test');

        $this->getJson('/api/v1/payments?status=unknown')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->getJson('/api/v1/payments?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);
    }
}
