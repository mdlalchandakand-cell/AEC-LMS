<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ContentManagementApiTest extends TestCase
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
        ]);

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->unsignedBigInteger('created_by');
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('teacher_course_assignments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('teacher_user_id');
            $table->boolean('is_active')->default(true);
        });

        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('content_type', 20);
            $table->longText('body')->nullable();
            $table->string('media_url', 1000)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(0);
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('course_content', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->dateTime('created_at')->nullable();
            $table->unique(['course_id', 'content_item_id']);
        });

        Schema::create('recycle_bin_items', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 40);
            $table->unsignedBigInteger('entity_id');
            $table->string('title', 255);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('snapshot');
            $table->string('status', 20)->default('active');
            $table->dateTime('deleted_at');
            $table->dateTime('expires_at');
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

    private function createCourse(int $teacherId, string $slug): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => 10,
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'created_by' => $teacherId,
        ]);
    }

    private function createContent(int $teacherId, string $title = 'Lesson One'): int
    {
        return (int) DB::table('content_items')->insertGetId([
            'title' => $title,
            'content_type' => 'video',
            'body' => 'Lesson body',
            'media_url' => 'https://youtu.be/abc123',
            'duration_minutes' => 15,
            'status' => 'published',
            'created_by' => $teacherId,
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

    public function test_teacher_can_create_youtube_lesson_linked_to_own_course(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId, 'ssc-english');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/content-management', [
            'course_id' => $courseId,
            'title' => 'Suffix and Prefix One Shot',
            'content_type' => 'video',
            'body' => 'Full lesson notes',
            'media_url' => 'https://www.youtube.com/watch?v=abc123',
            'duration_minutes' => 90,
            'status' => 'published',
            'sort_order' => 1,
            'is_preview' => true,
        ])->assertCreated();

        $contentId = (int) DB::table('content_items')->where('title', 'Suffix and Prefix One Shot')->value('id');
        $this->assertDatabaseHas('content_items', [
            'id' => $contentId,
            'created_by' => $teacherId,
            'content_type' => 'video',
            'status' => 'published',
            'media_url' => 'https://www.youtube.com/watch?v=abc123',
        ]);
        $this->assertDatabaseHas('course_content', [
            'course_id' => $courseId,
            'content_item_id' => $contentId,
            'sort_order' => 1,
            'is_preview' => 1,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $teacherId,
            'action' => 'content.created',
            'entity_id' => $contentId,
        ]);
    }

    public function test_teacher_cannot_link_content_to_another_teachers_course(): void
    {
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $courseOne = $this->createCourse($teacherOne, 'course-one');
        $courseTwo = $this->createCourse($teacherTwo, 'course-two');
        $contentId = $this->createContent($teacherOne);
        DB::table('course_content')->insert([
            'course_id' => $courseOne,
            'content_item_id' => $contentId,
            'sort_order' => 1,
            'is_preview' => 0,
            'created_at' => now(),
        ]);
        $this->login('teacher-one@example.test');

        $this->postJson('/api/v1/content-management/attach', [
            'course_id' => $courseTwo,
            'content_item_id' => $contentId,
            'sort_order' => 2,
        ])->assertNotFound();

        $this->assertDatabaseMissing('course_content', [
            'course_id' => $courseTwo,
            'content_item_id' => $contentId,
        ]);
    }

    public function test_teacher_cannot_edit_or_delete_content_created_by_another_teacher(): void
    {
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $contentId = $this->createContent($teacherTwo);
        $this->login('teacher-one@example.test');

        $this->patchJson('/api/v1/content-management/' . $contentId, [
            'title' => 'Hijacked lesson',
            'content_type' => 'video',
        ])->assertNotFound();
        $this->deleteJson('/api/v1/content-management/' . $contentId)->assertNotFound();

        $this->assertDatabaseHas('content_items', [
            'id' => $contentId,
            'created_by' => $teacherTwo,
            'title' => 'Lesson One',
            'deleted_at' => null,
        ]);
    }

    public function test_teacher_can_delete_and_restore_own_content_through_recycle_bin(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $contentId = $this->createContent($teacherId);
        $this->login('teacher@example.test');

        $this->deleteJson('/api/v1/content-management/' . $contentId)
            ->assertOk();

        $this->assertNotNull(DB::table('content_items')->where('id', $contentId)->value('deleted_at'));
        $this->assertDatabaseHas('recycle_bin_items', [
            'entity_type' => 'content',
            'entity_id' => $contentId,
            'status' => 'active',
            'deleted_by' => $teacherId,
        ]);

        $this->postJson('/api/v1/content-management/' . $contentId . '/restore')
            ->assertOk();

        $this->assertDatabaseHas('content_items', [
            'id' => $contentId,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('recycle_bin_items', [
            'entity_type' => 'content',
            'entity_id' => $contentId,
            'status' => 'restored',
            'restored_by' => $teacherId,
        ]);
    }

    public function test_content_rejects_non_https_media_urls(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId, 'ssc-english');
        $this->login('teacher@example.test');

        $this->postJson('/api/v1/content-management', [
            'course_id' => $courseId,
            'title' => 'Insecure video',
            'content_type' => 'video',
            'media_url' => 'http://example.com/video.mp4',
        ])->assertUnprocessable();

        $this->assertSame(0, DB::table('content_items')->count());
    }
}
