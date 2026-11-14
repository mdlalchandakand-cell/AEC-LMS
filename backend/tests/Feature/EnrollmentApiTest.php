<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
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

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->string('thumbnail', 500)->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('enrolled_by')->nullable();
            $table->dateTime('enrolled_at')->useCurrent();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->string('notes', 1000)->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->nullable();
            $table->unique(['user_id', 'course_id']);
        });

        DB::table('role_permissions')->insert([
            ['role' => 'admin', 'permission_key' => 'enrollments.manage', 'allowed' => 1],
            ['role' => 'branch_manager', 'permission_key' => 'enrollments.manage', 'allowed' => 1],
        ]);
    }

    private function createUser(string $email, string $role, string $name, ?int $branchId = null): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => $name,
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

    public function test_student_only_sees_own_enrollments_and_deleted_courses_are_hidden(): void
    {
        $studentId = $this->createUser('student-one@example.test', 'student', 'Student One');
        $otherStudentId = $this->createUser('student-two@example.test', 'student', 'Student Two');
        $publishedCourseId = DB::table('courses')->insertGetId([
            'title' => 'Published Course',
            'slug' => 'published-course',
            'thumbnail' => 'published.jpg',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $deletedCourseId = DB::table('courses')->insertGetId([
            'title' => 'Deleted Course',
            'slug' => 'deleted-course',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
            'deleted_at' => now(),
        ]);

        DB::table('course_enrollments')->insert([
            ['user_id' => $studentId, 'course_id' => $publishedCourseId, 'status' => 'active', 'enrolled_at' => now(), 'created_at' => now()],
            ['user_id' => $studentId, 'course_id' => $deletedCourseId, 'status' => 'active', 'enrolled_at' => now(), 'created_at' => now()],
            ['user_id' => $otherStudentId, 'course_id' => $publishedCourseId, 'status' => 'active', 'enrolled_at' => now(), 'created_at' => now()],
        ]);

        $this->login('student-one@example.test');

        $this->getJson('/api/v1/enrollments/my')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.course_title', 'Published Course')
            ->assertJsonMissing(['course_title' => 'Deleted Course']);
    }

    public function test_admin_with_enrollment_permission_can_list_and_filter_enrollments(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin', 'LMS Admin');
        $studentId = $this->createUser('student@example.test', 'student', 'Student');
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'HSC English',
            'slug' => 'hsc-english',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pendingCourseId = DB::table('courses')->insertGetId([
            'title' => 'Pending Course',
            'slug' => 'pending-course',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('course_enrollments')->insert([
            ['user_id' => $studentId, 'course_id' => $courseId, 'status' => 'active', 'enrolled_by' => $adminId, 'notes' => 'Approved', 'enrolled_at' => now(), 'created_at' => now()],
            ['user_id' => $studentId, 'course_id' => $pendingCourseId, 'status' => 'pending', 'enrolled_by' => $adminId, 'notes' => 'Pending review', 'enrolled_at' => now(), 'created_at' => now()],
        ]);

        $this->login('admin@example.test');

        $this->getJson('/api/v1/enrollments?status=active')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.student_name', 'Student')
            ->assertJsonPath('data.items.0.course_title', 'HSC English')
            ->assertJsonPath('data.items.0.notes', 'Approved')
            ->assertJsonMissing(['notes' => 'Pending review']);
    }

    public function test_student_cannot_access_admin_enrollment_list(): void
    {
        $this->createUser('student@example.test', 'student', 'Student');
        $this->login('student@example.test');

        $this->getJson('/api/v1/enrollments')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_branch_manager_only_sees_enrollments_in_their_active_branch(): void
    {
        DB::table('branches')->insert([
            ['id' => 10, 'code' => 'BR-10', 'name' => 'Branch 10', 'is_active' => 1],
            ['id' => 20, 'code' => 'BR-20', 'name' => 'Branch 20', 'is_active' => 1],
        ]);
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 'Branch Manager', 10);
        $studentOne = $this->createUser('student-one@example.test', 'student', 'Student One', 10);
        $studentTwo = $this->createUser('student-two@example.test', 'student', 'Student Two', 20);
        $courseOne = DB::table('courses')->insertGetId([
            'branch_id' => 10, 'title' => 'Branch 10 Course', 'slug' => 'branch-10-course',
            'status' => 'published', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $courseTwo = DB::table('courses')->insertGetId([
            'branch_id' => 20, 'title' => 'Branch 20 Course', 'slug' => 'branch-20-course',
            'status' => 'published', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('course_enrollments')->insert([
            ['user_id' => $studentOne, 'course_id' => $courseOne, 'branch_id' => 10, 'status' => 'active', 'enrolled_by' => $managerId, 'enrolled_at' => now(), 'created_at' => now()],
            ['user_id' => $studentTwo, 'course_id' => $courseTwo, 'branch_id' => 20, 'status' => 'active', 'enrolled_by' => $managerId, 'enrolled_at' => now(), 'created_at' => now()],
        ]);

        $this->login('manager@example.test');

        $this->getJson('/api/v1/enrollments')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.course_title', 'Branch 10 Course')
            ->assertJsonMissing(['course_title' => 'Branch 20 Course']);
    }

    public function test_branch_manager_without_active_branch_is_forbidden(): void
    {
        $this->createUser('manager@example.test', 'branch_manager', 'Branch Manager', 404);
        $this->login('manager@example.test');

        $this->getJson('/api/v1/enrollments')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_admin_enrollment_filters_are_validated(): void
    {
        $this->createUser('admin@example.test', 'admin', 'LMS Admin');
        $this->login('admin@example.test');

        $this->getJson('/api/v1/enrollments?status=unknown')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->getJson('/api/v1/enrollments?per_page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);
    }
}
