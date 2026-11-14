<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CourseProgressApiTest extends TestCase
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

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
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
            $table->string('status', 20)->default('pending');
            $table->dateTime('enrolled_at')->useCurrent();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('content_type', 20)->default('lesson');
            $table->text('body')->nullable();
            $table->string('media_url', 1000)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(0);
            $table->string('status', 20)->default('published');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('course_content', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->dateTime('created_at')->nullable();
            $table->unique(['course_id', 'content_item_id']);
        });

        Schema::create('course_lesson_progress', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
            $table->boolean('is_completed')->default(false);
            $table->text('notes')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent();
            $table->unique(['user_id', 'course_id', 'content_item_id']);
        });
    }

    private function createUser(string $email, string $role): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => ucfirst($role) . ' User',
            'email' => $email,
            'phone' => '01700000000',
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => $role,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createCourse(string $slug, string $status = 'published', ?string $deletedAt = null): int
    {
        return (int) DB::table('courses')->insertGetId([
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'status' => $status,
            'deleted_at' => $deletedAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createLesson(int $courseId, string $slug = 'lesson-one', string $status = 'published', ?string $deletedAt = null): int
    {
        $contentId = (int) DB::table('content_items')->insertGetId([
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'content_type' => 'lesson',
            'body' => 'Lesson body',
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
            'deleted_at' => $deletedAt,
        ]);
        DB::table('course_content')->insert([
            'course_id' => $courseId,
            'content_item_id' => $contentId,
            'sort_order' => 1,
            'is_preview' => 0,
            'created_at' => now(),
        ]);

        return $contentId;
    }

    private function enroll(int $studentId, int $courseId, string $status = 'active'): void
    {
        DB::table('course_enrollments')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'status' => $status,
            'enrolled_at' => now(),
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

    public function test_student_can_view_only_their_own_course_progress(): void
    {
        $studentId = $this->createUser('student-one@example.test', 'student');
        $otherStudentId = $this->createUser('student-two@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $lessonId = $this->createLesson($courseId);
        $this->enroll($studentId, $courseId);
        $this->enroll($otherStudentId, $courseId);

        DB::table('course_lesson_progress')->insert([
            [
                'user_id' => $studentId,
                'course_id' => $courseId,
                'content_item_id' => $lessonId,
                'is_completed' => 1,
                'notes' => 'My notes',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $otherStudentId,
                'course_id' => $courseId,
                'content_item_id' => $lessonId,
                'is_completed' => 0,
                'notes' => 'Private notes',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->login('student-one@example.test');

        $this->getJson('/api/v1/courses/' . $courseId . '/progress')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.notes', 'My notes')
            ->assertJsonMissing(['notes' => 'Private notes']);
    }

    public function test_enrolled_student_can_update_published_lesson_progress_without_duplicate_rows(): void
    {
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('hsc-english');
        $lessonId = $this->createLesson($courseId);
        $this->enroll($studentId, $courseId);
        $this->login('student@example.test');

        $payload = [
            'course_id' => $courseId,
            'content_item_id' => $lessonId,
            'is_completed' => true,
            'notes' => 'Completed after revision.',
        ];

        $this->postJson('/api/v1/progress/lessons', $payload)
            ->assertOk()
            ->assertJsonPath('data.is_completed', true);

        $createdAt = DB::table('course_lesson_progress')
            ->where('user_id', $studentId)
            ->where('course_id', $courseId)
            ->where('content_item_id', $lessonId)
            ->value('created_at');

        $this->postJson('/api/v1/progress/lessons', array_merge($payload, [
            'is_completed' => false,
            'notes' => 'Revisiting this lesson.',
        ]))->assertOk()
            ->assertJsonPath('data.is_completed', false);

        $this->assertSame(1, DB::table('course_lesson_progress')
            ->where('user_id', $studentId)
            ->where('course_id', $courseId)
            ->where('content_item_id', $lessonId)
            ->count());
        $this->assertSame($createdAt, DB::table('course_lesson_progress')
            ->where('user_id', $studentId)
            ->where('course_id', $courseId)
            ->where('content_item_id', $lessonId)
            ->value('created_at'));
        $this->assertDatabaseHas('course_lesson_progress', [
            'user_id' => $studentId,
            'course_id' => $courseId,
            'content_item_id' => $lessonId,
            'is_completed' => 0,
            'notes' => 'Revisiting this lesson.',
        ]);
    }

    public function test_student_without_active_or_completed_enrollment_cannot_track_progress(): void
    {
        $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $lessonId = $this->createLesson($courseId);
        $this->login('student@example.test');

        $this->getJson('/api/v1/courses/' . $courseId . '/progress')->assertForbidden();
        $this->postJson('/api/v1/progress/lessons', [
            'course_id' => $courseId,
            'content_item_id' => $lessonId,
            'is_completed' => true,
        ])->assertForbidden();
    }

    public function test_progress_update_rejects_unpublished_or_unlinked_lessons(): void
    {
        $studentId = $this->createUser('student@example.test', 'student');
        $courseId = $this->createCourse('ssc-english');
        $unpublishedLessonId = $this->createLesson($courseId, 'draft-lesson', 'draft');
        $this->enroll($studentId, $courseId);
        $this->login('student@example.test');

        $this->postJson('/api/v1/progress/lessons', [
            'course_id' => $courseId,
            'content_item_id' => $unpublishedLessonId,
            'is_completed' => true,
        ])->assertNotFound();

        $this->postJson('/api/v1/progress/lessons', [
            'course_id' => $courseId,
            'content_item_id' => 999,
            'is_completed' => true,
        ])->assertNotFound();
    }

    public function test_course_manager_can_track_progress_without_student_enrollment(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $courseId = $this->createCourse('admin-course');
        $lessonId = $this->createLesson($courseId);
        DB::table('role_permissions')->insert([
            'role' => 'admin',
            'permission_key' => 'courses.manage',
            'allowed' => 1,
        ]);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/progress/lessons', [
            'course_id' => $courseId,
            'content_item_id' => $lessonId,
            'is_completed' => true,
        ])->assertOk();
    }

    public function test_progress_cannot_be_viewed_for_deleted_or_unpublished_courses_by_students(): void
    {
        $this->createUser('student@example.test', 'student');
        $deletedCourse = $this->createCourse('deleted-course', 'published', now()->toDateTimeString());
        $draftCourse = $this->createCourse('draft-course', 'draft');
        $this->login('student@example.test');

        $this->getJson('/api/v1/courses/' . $deletedCourse . '/progress')->assertForbidden();
        $this->getJson('/api/v1/courses/' . $draftCourse . '/progress')->assertForbidden();
    }
}
