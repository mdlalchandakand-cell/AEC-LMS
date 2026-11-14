<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LiveClassApiTest extends TestCase
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

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->string('status', 20)->default('published');
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('enrolled_by')->nullable();
            $table->dateTime('enrolled_at')->useCurrent();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->nullable();
            $table->unique(['user_id', 'course_id']);
        });

        Schema::create('live_classes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('instructor_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->dateTime('starts_at');
            $table->string('timezone', 64)->default('Asia/Dhaka');
            $table->string('meeting_platform', 20);
            $table->string('meeting_url', 2048);
            $table->string('recording_url', 2048)->nullable();
            $table->string('status', 20)->default('upcoming');
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->useCurrent();
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
            $table->string('title_bn', 180)->nullable();
            $table->text('message');
            $table->text('message_bn')->nullable();
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

    private function createCourse(string $title, string $slug, ?int $branchId = null): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => $branchId,
            'title' => $title,
            'slug' => $slug,
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createLiveClass(int $courseId, int $instructorId, ?int $branchId, string $status = 'upcoming'): int
    {
        return (int) DB::table('live_classes')->insertGetId([
            'course_id' => $courseId,
            'instructor_id' => $instructorId,
            'branch_id' => $branchId,
            'title' => 'SSC English Live Class',
            'starts_at' => '2026-11-20 15:00:00',
            'timezone' => 'Asia/Dhaka',
            'meeting_platform' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/abc-defg-hij',
            'status' => $status,
            'created_by' => $instructorId,
            'created_at' => now(),
        ]);
    }

    private function enroll(int $studentId, int $courseId, ?int $branchId, string $status = 'active'): void
    {
        DB::table('course_enrollments')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'branch_id' => $branchId,
            'status' => $status,
            'enrolled_at' => now(),
            'created_at' => now(),
        ]);
    }

    private function grant(string $role, string $permission = 'live_classes.manage'): void
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

    public function test_teacher_can_schedule_live_class_and_notify_students(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse('SSC English', 'ssc-english', 10);
        $this->enroll($studentId, $courseId, 10);
        $this->grant('teacher');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/live-classes', [
            'course_id' => $courseId,
            'title' => 'Grammar Live Session',
            'date' => '2026-11-20',
            'time' => '15:00',
            'meeting_platform' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/abc-defg-hij',
        ])->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('live_classes', [
            'course_id' => $courseId,
            'instructor_id' => $teacherId,
            'branch_id' => 10,
            'title' => 'Grammar Live Session',
            'timezone' => 'Asia/Dhaka',
            'status' => 'upcoming',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $teacherId,
            'action' => 'live_class.created',
            'entity_type' => 'live_class',
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $teacherId,
            'title' => 'New live class assigned',
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $studentId,
            'title' => 'New live class scheduled',
        ]);
    }

    public function test_live_class_creation_rejects_meeting_url_from_wrong_platform(): void
    {
        $this->createUser('teacher@example.test', 'teacher');
        $courseId = $this->createCourse('SSC English', 'ssc-english');
        $this->grant('teacher');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/live-classes', [
            'course_id' => $courseId,
            'title' => 'Invalid Meeting Link',
            'date' => '2026-11-20',
            'time' => '15:00',
            'meeting_platform' => 'zoom',
            'meeting_url' => 'https://example.com/not-zoom',
        ])->assertUnprocessable();

        $this->assertSame(0, DB::table('live_classes')->count());
    }

    public function test_student_only_sees_live_classes_for_active_course_enrollments(): void
    {
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $courseOne = $this->createCourse('Course One', 'course-one', 10);
        $courseTwo = $this->createCourse('Course Two', 'course-two', 10);
        $this->enroll($studentId, $courseOne, 10, 'active');
        $this->createLiveClass($courseOne, $teacherOne, 10);
        $this->createLiveClass($courseTwo, $teacherTwo, 10);
        $this->createLiveClass($courseOne, $teacherOne, 10, 'cancelled');

        $this->login('student@example.test');

        $this->getJson('/api/v1/live-classes')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.course_title', 'Course One');
    }

    public function test_teacher_can_start_live_class_and_add_https_recording(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse('SSC English', 'ssc-english', 10);
        $this->enroll($studentId, $courseId, 10);
        $liveClassId = $this->createLiveClass($courseId, $teacherId, 10);
        $this->grant('teacher');
        $this->login('teacher@example.test');

        $this->patchJson('/api/v1/live-classes/' . $liveClassId, [
            'status' => 'live',
            'recording_url' => 'https://video.example.test/recordings/ssc-english',
        ])->assertOk()
            ->assertJsonPath('data.status', 'live');

        $this->assertDatabaseHas('live_classes', [
            'id' => $liveClassId,
            'status' => 'live',
            'recording_url' => 'https://video.example.test/recordings/ssc-english',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $teacherId,
            'action' => 'live_class.updated',
            'entity_id' => $liveClassId,
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $studentId,
            'title' => 'Live class started',
            'type' => 'success',
        ]);
    }

    public function test_teacher_cannot_manage_another_teachers_live_class(): void
    {
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $courseId = $this->createCourse('SSC English', 'ssc-english', 10);
        $liveClassId = $this->createLiveClass($courseId, $teacherTwo, 10);
        $this->grant('teacher');
        $this->login('teacher-one@example.test');

        $this->patchJson('/api/v1/live-classes/' . $liveClassId, [
            'status' => 'live',
        ])->assertForbidden();

        $this->assertDatabaseHas('live_classes', [
            'id' => $liveClassId,
            'status' => 'upcoming',
        ]);
    }

    public function test_admin_can_cancel_upcoming_live_class_and_notify_enrolled_students(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse('SSC English', 'ssc-english', 10);
        $this->enroll($studentId, $courseId, 10);
        $liveClassId = $this->createLiveClass($courseId, $teacherId, 10);
        $this->grant('admin');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/live-classes/' . $liveClassId . '/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('live_classes', [
            'id' => $liveClassId,
            'status' => 'cancelled',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $adminId,
            'action' => 'live_class.cancelled',
            'entity_id' => $liveClassId,
        ]);
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $studentId,
            'title' => 'Live class cancelled',
            'type' => 'warning',
        ]);
    }

    public function test_branch_manager_cannot_schedule_live_class_outside_assigned_branch(): void
    {
        $this->createUser('manager@example.test', 'branch_manager', 10);
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 20);
        $courseId = $this->createCourse('Branch 20 Course', 'branch-20-course', 20);
        $this->grant('branch_manager');
        $this->login('manager@example.test');

        $this->postJson('/api/v1/live-classes', [
            'course_id' => $courseId,
            'instructor_id' => $teacherId,
            'title' => 'Cross Branch Session',
            'date' => '2026-11-20',
            'time' => '15:00',
            'meeting_platform' => 'google_meet',
            'meeting_url' => 'https://meet.google.com/abc-defg-hij',
        ])->assertForbidden();

        $this->assertSame(0, DB::table('live_classes')->count());
    }
}
