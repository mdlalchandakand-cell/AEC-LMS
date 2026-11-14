<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GuardianApiTest extends TestCase
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
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
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

        Schema::create('guardian_student_links', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('guardian_user_id');
            $table->unsignedBigInteger('student_user_id');
            $table->string('relationship', 60)->default('Guardian');
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('requested_by');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('requested_at')->useCurrent();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->nullable();
            $table->unique(['guardian_user_id', 'student_user_id']);
        });

        Schema::create('account_action_attempts', function (Blueprint $table): void {
            $table->id();
            $table->string('action', 32);
            $table->string('email', 190);
            $table->string('ip_address', 45);
            $table->dateTime('attempted_at')->useCurrent();
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
            $table->string('title_bn', 180)->nullable();
            $table->text('message');
            $table->text('message_bn')->nullable();
            $table->string('type', 20)->default('info');
            $table->string('target_role', 40)->default('all');
            $table->string('action_url', 80)->nullable();
            $table->dateTime('created_at')->useCurrent();
        });

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->dateTime('created_at')->nullable();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->string('status', 20)->default('pending');
            $table->dateTime('enrolled_at')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
        });

        Schema::create('attendance_records', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->date('attendance_date');
            $table->string('status', 20);
            $table->string('remarks', 255)->nullable();
        });

        Schema::create('exams', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
        });

        Schema::create('exam_attempts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('exam_id');
            $table->decimal('score', 8, 2)->nullable();
            $table->decimal('total_marks', 8, 2)->nullable();
            $table->decimal('percentage', 6, 2)->nullable();
            $table->boolean('passed')->default(false);
            $table->string('status', 20);
            $table->dateTime('submitted_at')->nullable();
        });

        Schema::create('course_payments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->string('payment_method', 32);
            $table->string('status', 20);
            $table->dateTime('submitted_at')->nullable();
            $table->dateTime('reviewed_at')->nullable();
        });

        Schema::create('certificates', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('student_user_id');
            $table->string('certificate_number', 100);
            $table->string('course_title_snapshot', 180);
            $table->string('grade', 20)->nullable();
            $table->string('status', 20);
            $table->dateTime('issued_at')->nullable();
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

    private function createLink(int $guardianId, int $studentId, string $status = 'pending'): int
    {
        return (int) DB::table('guardian_student_links')->insertGetId([
            'guardian_user_id' => $guardianId,
            'student_user_id' => $studentId,
            'relationship' => 'Mother',
            'status' => $status,
            'requested_by' => $guardianId,
            'requested_at' => now(),
            'created_at' => now(),
        ]);
    }

    private function login(string $email): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();
    }

    public function test_guardian_can_request_student_link_but_student_must_approve_it(): void
    {
        $guardianId = $this->createUser('guardian@example.test', 'guardian', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $this->login('guardian@example.test');

        $this->postJson('/api/v1/guardians/requests', [
            'student_email' => ' STUDENT@example.test ',
            'relationship' => 'Mother',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('guardian_student_links', [
            'guardian_user_id' => $guardianId,
            'student_user_id' => $studentId,
            'status' => 'pending',
            'relationship' => 'Mother',
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $studentId,
            'sender_user_id' => $guardianId,
            'title' => 'Guardian link request',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $guardianId,
            'action' => 'guardian_link.requested',
        ]);

        $this->postJson('/api/v1/guardians/requests', [
            'student_email' => 'student@example.test',
        ])->assertStatus(409);
    }

    public function test_student_can_accept_guardian_request_and_guardian_can_view_linked_student(): void
    {
        $guardianId = $this->createUser('guardian@example.test', 'guardian', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $linkId = $this->createLink($guardianId, $studentId, 'pending');
        $this->login('student@example.test');

        $this->getJson('/api/v1/guardians/incoming')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.guardian_user_id', $guardianId);

        $this->postJson('/api/v1/guardians/' . $linkId . '/respond', [
            'decision' => 'accept',
        ])->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('guardian_student_links', [
            'id' => $linkId,
            'status' => 'active',
            'reviewed_by' => $studentId,
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $guardianId,
            'sender_user_id' => $studentId,
            'title' => 'Guardian link request update',
            'type' => 'success',
        ]);
    }

    public function test_guardian_summary_requires_active_link_and_returns_student_records(): void
    {
        $guardianId = $this->createUser('guardian@example.test', 'guardian', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $unlinkedStudentId = $this->createUser('unlinked@example.test', 'student', 10);
        $this->createLink($guardianId, $studentId, 'active');

        $courseId = (int) DB::table('courses')->insertGetId([
            'title' => 'SSC English',
            'slug' => 'ssc-english',
            'created_at' => now(),
        ]);
        DB::table('course_enrollments')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
        DB::table('attendance_records')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'attendance_date' => '2026-11-13',
            'status' => 'present',
            'remarks' => 'On time',
        ]);
        $examId = (int) DB::table('exams')->insertGetId(['title' => 'SSC English Model Test']);
        DB::table('exam_attempts')->insert([
            'user_id' => $studentId,
            'exam_id' => $examId,
            'score' => 85,
            'total_marks' => 100,
            'percentage' => 85,
            'passed' => 1,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
        DB::table('course_payments')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'amount' => '1000.00',
            'currency' => 'BDT',
            'payment_method' => 'bKash',
            'status' => 'verified',
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);
        DB::table('certificates')->insert([
            'student_user_id' => $studentId,
            'certificate_number' => 'AEC-CERT-001',
            'course_title_snapshot' => 'SSC English',
            'grade' => 'A',
            'status' => 'issued',
            'issued_at' => now(),
        ]);

        $this->login('guardian@example.test');

        $this->getJson('/api/v1/guardians/summary?student_id=' . $studentId)
            ->assertOk()
            ->assertJsonPath('data.student.id', $studentId)
            ->assertJsonCount(1, 'data.courses')
            ->assertJsonCount(1, 'data.attendance')
            ->assertJsonCount(1, 'data.exams')
            ->assertJsonCount(1, 'data.payments')
            ->assertJsonCount(1, 'data.certificates');

        $this->getJson('/api/v1/guardians/summary?student_id=' . $unlinkedStudentId)
            ->assertNotFound();
    }

    public function test_guardian_can_revoke_link_and_immediately_lose_summary_access(): void
    {
        $guardianId = $this->createUser('guardian@example.test', 'guardian', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $linkId = $this->createLink($guardianId, $studentId, 'active');
        $this->login('guardian@example.test');

        $this->postJson('/api/v1/guardians/' . $linkId . '/revoke')
            ->assertOk()
            ->assertJsonPath('data.status', 'revoked');

        $this->assertDatabaseHas('guardian_student_links', [
            'id' => $linkId,
            'status' => 'revoked',
        ]);
        $this->getJson('/api/v1/guardians/summary?student_id=' . $studentId)
            ->assertNotFound();
    }

    public function test_guardian_request_rejects_student_in_another_branch(): void
    {
        $this->createUser('guardian@example.test', 'guardian', 10);
        $this->createUser('student@example.test', 'student', 20);
        $this->login('guardian@example.test');

        $this->postJson('/api/v1/guardians/requests', [
            'student_email' => 'student@example.test',
        ])->assertForbidden();

        $this->assertSame(0, DB::table('guardian_student_links')->count());
    }

    public function test_admin_and_branch_manager_can_list_guardian_links_with_branch_scope(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 10);
        $guardianOne = $this->createUser('guardian-one@example.test', 'guardian', 10);
        $studentOne = $this->createUser('student-one@example.test', 'student', 10);
        $guardianTwo = $this->createUser('guardian-two@example.test', 'guardian', 20);
        $studentTwo = $this->createUser('student-two@example.test', 'student', 20);
        $this->createLink($guardianOne, $studentOne, 'active');
        $this->createLink($guardianTwo, $studentTwo, 'pending');
        DB::table('role_permissions')->insert([
            'role' => 'branch_manager',
            'permission_key' => 'guardians.manage',
            'allowed' => 1,
        ]);
        $this->login('manager@example.test');

        $this->getJson('/api/v1/guardians')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.guardian_user_id', $guardianOne);
    }
}
