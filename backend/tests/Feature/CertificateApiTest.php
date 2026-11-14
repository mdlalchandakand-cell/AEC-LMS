<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CertificateApiTest extends TestCase
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
            $table->string('status', 20)->default('published');
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20);
            $table->dateTime('completed_at')->nullable();
        });

        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('status', 20);
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('course_content', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
        });

        Schema::create('course_lesson_progress', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('is_completed')->default(false);
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('certificates', function (Blueprint $table): void {
            $table->id();
            $table->string('certificate_number', 60)->unique();
            $table->unsignedBigInteger('student_user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('student_id_snapshot', 40);
            $table->string('student_name_snapshot', 160);
            $table->string('course_title_snapshot', 180);
            $table->date('completion_date');
            $table->string('grade', 100)->default('Completed');
            $table->string('authorized_by', 160);
            $table->string('status', 20)->default('issued');
            $table->unsignedBigInteger('issued_by');
            $table->dateTime('issued_at');
            $table->unsignedBigInteger('revoked_by')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->string('revoke_reason', 500)->nullable();
            $table->dateTime('created_at')->nullable();
            $table->unique(['student_user_id', 'course_id']);
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

    private function createCourse(int $branchId = 10): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => $branchId,
            'title' => 'SSC English',
            'status' => 'published',
        ]);
    }

    private function enroll(int $studentId, int $courseId, string $status = 'completed', ?int $branchId = 10): int
    {
        return (int) DB::table('course_enrollments')->insertGetId([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'branch_id' => $branchId,
            'status' => $status,
            'completed_at' => $status === 'completed' ? now()->subDay() : null,
        ]);
    }

    private function grant(string $role, string $permission = 'certificates.manage'): void
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

    public function test_admin_can_issue_and_publicly_verify_completed_course_certificate(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse(10);
        $this->enroll($studentId, $courseId, 'completed', 10);
        $this->grant('admin');
        $this->login('admin@example.test');

        $response = $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
            'grade' => 'A+',
        ])->assertCreated();

        $number = (string) $response->json('data.certificate_number');
        $this->assertMatchesRegularExpression('/^AEC-CERT-\d{4}-[A-F0-9]{32}$/', $number);
        $this->assertDatabaseHas('certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
            'issued_by' => $adminId,
            'status' => 'issued',
            'grade' => 'A+',
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $studentId,
            'title' => 'Certificate issued',
        ]);

        $this->getJson('/api/v1/certificates/verify/' . $number)
            ->assertOk()
            ->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.student_name', 'Student')
            ->assertJsonMissingPath('data.student_user_id');
    }

    public function test_certificate_requires_course_completion_or_all_lessons_completed(): void
    {
        $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse(10);
        $this->enroll($studentId, $courseId, 'active', 10);
        $contentId = (int) DB::table('content_items')->insertGetId(['status' => 'published']);
        DB::table('course_content')->insert(['course_id' => $courseId, 'content_item_id' => $contentId]);
        $this->grant('admin');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertStatus(409);

        DB::table('course_lesson_progress')->insert([
            'course_id' => $courseId,
            'content_item_id' => $contentId,
            'user_id' => $studentId,
            'is_completed' => 1,
            'updated_at' => now(),
        ]);

        $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertCreated();
    }

    public function test_duplicate_certificate_for_same_student_and_course_is_rejected(): void
    {
        $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse(10);
        $this->enroll($studentId, $courseId, 'completed', 10);
        $this->grant('admin');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertCreated();
        $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertStatus(409);

        $this->assertSame(1, DB::table('certificates')->count());
    }

    public function test_branch_manager_cannot_issue_certificate_outside_own_branch(): void
    {
        $this->createUser('manager@example.test', 'branch_manager', 10);
        $studentId = $this->createUser('student@example.test', 'student', 20);
        $courseId = $this->createCourse(20);
        $this->enroll($studentId, $courseId, 'completed', 20);
        $this->grant('branch_manager');
        $this->login('manager@example.test');

        $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertForbidden();

        $this->assertSame(0, DB::table('certificates')->count());
    }

    public function test_student_sees_only_own_certificates_and_revoke_updates_public_validity(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', null);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $otherStudent = $this->createUser('other@example.test', 'student', 10);
        $courseId = $this->createCourse(10);
        $this->enroll($studentId, $courseId, 'completed', 10);
        $this->grant('admin');
        $this->login('admin@example.test');

        $response = $this->postJson('/api/v1/certificates', [
            'student_user_id' => $studentId,
            'course_id' => $courseId,
        ])->assertCreated();
        $number = (string) $response->json('data.certificate_number');

        $this->postJson('/api/v1/certificates/' . DB::table('certificates')->value('id') . '/revoke', [
            'reason' => 'Incorrect record',
        ])->assertOk();

        $this->getJson('/api/v1/certificates/verify/' . $number)
            ->assertOk()
            ->assertJsonPath('data.valid', false)
            ->assertJsonPath('data.status', 'revoked');

        $this->getJson('/api/v1/certificates/my')->assertForbidden();
        $this->postJson('/api/v1/auth/logout', []);
        $this->login('student@example.test');
        $this->getJson('/api/v1/certificates/my')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.status', 'revoked')
            ->assertJsonMissing(['student_user_id' => $otherStudent]);
    }
}
