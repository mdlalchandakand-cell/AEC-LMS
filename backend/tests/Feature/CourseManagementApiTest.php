<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CourseManagementApiTest extends TestCase
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

        Schema::create('course_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->unsignedBigInteger('branch_id')->nullable();
        });

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->string('subtitle', 255)->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('original_price', 12, 2)->default(0);
            $table->string('level', 80)->default('All Levels');
            $table->unsignedSmallInteger('duration_weeks')->default(0);
            $table->string('thumbnail', 2048)->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('course_content', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
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

        Schema::create('recycle_bin_items', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 40);
            $table->unsignedBigInteger('entity_id');
            $table->string('title', 255);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('deleted_by');
            $table->text('snapshot')->nullable();
            $table->string('status', 20)->default('active');
            $table->dateTime('deleted_at');
            $table->dateTime('expires_at')->nullable();
            $table->unsignedBigInteger('restored_by')->nullable();
            $table->dateTime('restored_at')->nullable();
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

    private function createCourse(int $creatorId, string $slug, ?int $branchId = null): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => $branchId,
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'price' => '1000.00',
            'status' => 'draft',
            'created_by' => $creatorId,
            'created_at' => now(),
        ]);
    }

    private function grant(string $role, string $permission = 'courses.manage'): void
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

    private function coursePayload(string $slug = 'ssc-english'): array
    {
        return [
            'title' => 'SSC English Grammar',
            'slug' => $slug,
            'subtitle' => 'Complete grammar course',
            'description' => 'Course description',
            'price' => '1200.00',
            'original_price' => '1500.00',
            'level' => 'SSC',
            'duration_weeks' => 12,
            'status' => 'published',
        ];
    }

    public function test_teacher_can_create_and_list_own_course(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/course-management', $this->coursePayload())
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('courses', [
            'created_by' => $teacherId,
            'branch_id' => 10,
            'slug' => 'ssc-english',
            'price' => '1200.00',
            'status' => 'published',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $teacherId,
            'action' => 'course.created',
        ]);

        $this->getJson('/api/v1/course-management')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.slug', 'ssc-english');
    }

    public function test_teacher_cannot_update_or_delete_another_teachers_course(): void
    {
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherTwo, 'other-course', 10);
        $this->login('teacher-one@example.test');

        $this->patchJson('/api/v1/course-management/' . $courseId, $this->coursePayload('changed-course'))
            ->assertNotFound();
        $this->deleteJson('/api/v1/course-management/' . $courseId)->assertNotFound();

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
            'created_by' => $teacherTwo,
            'slug' => 'other-course',
            'deleted_at' => null,
        ]);
    }

    public function test_teacher_can_move_own_course_to_recycle_bin_and_restore_it(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId, 'teacher-course', 10);
        $this->login('teacher@example.test');

        $this->deleteJson('/api/v1/course-management/' . $courseId)
            ->assertOk()
            ->assertJsonPath('data.id', $courseId);

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
        ]);
        $this->assertNotNull(DB::table('courses')->where('id', $courseId)->value('deleted_at'));
        $this->assertDatabaseHas('recycle_bin_items', [
            'entity_type' => 'course',
            'entity_id' => $courseId,
            'status' => 'active',
            'deleted_by' => $teacherId,
        ]);

        $this->postJson('/api/v1/course-management/' . $courseId . '/restore')
            ->assertOk();

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('recycle_bin_items', [
            'entity_type' => 'course',
            'entity_id' => $courseId,
            'status' => 'restored',
            'restored_by' => $teacherId,
        ]);
    }

    public function test_branch_manager_can_create_courses_only_in_own_branch(): void
    {
        $this->createUser('manager@example.test', 'branch_manager', 10);
        $this->grant('branch_manager');
        $this->login('manager@example.test');

        $this->postJson('/api/v1/course-management', array_merge($this->coursePayload(), [
            'branch_id' => 20,
        ]))->assertCreated();

        $this->assertDatabaseHas('courses', [
            'slug' => 'ssc-english',
            'branch_id' => 10,
        ]);
    }

    public function test_admin_course_creation_rejects_category_from_another_branch(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $this->grant('admin');
        $categoryId = (int) DB::table('course_categories')->insertGetId([
            'name' => 'Branch 20 Category',
            'branch_id' => 20,
        ]);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/course-management', array_merge($this->coursePayload(), [
            'branch_id' => 10,
            'category_id' => $categoryId,
        ]))->assertUnprocessable();

        $this->assertSame(0, DB::table('courses')->count());
    }

    public function test_course_slug_conflict_is_reported_without_creating_duplicate(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher');
        $this->createCourse($teacherId, 'ssc-english');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/course-management', $this->coursePayload())
            ->assertStatus(409);

        $this->assertSame(1, DB::table('courses')->where('slug', 'ssc-english')->count());
    }
}
