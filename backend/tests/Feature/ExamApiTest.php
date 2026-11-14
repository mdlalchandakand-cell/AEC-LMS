<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ExamApiTest extends TestCase
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
            $table->string('status', 20)->default('published');
            $table->unsignedBigInteger('created_by');
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('teacher_course_assignments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('teacher_user_id');
            $table->boolean('is_active')->default(true);
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->string('status', 20)->default('pending');
            $table->dateTime('ends_at')->nullable();
        });

        Schema::create('user_subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('status', 20);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
        });

        Schema::create('user_subscription_courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('subscription_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('course_id');
            $table->string('status', 20);
            $table->unsignedBigInteger('branch_id')->nullable();
        });

        Schema::create('exams', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id')->nullable();
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_minutes');
            $table->decimal('total_marks', 8, 2)->default(0);
            $table->decimal('pass_marks', 8, 2)->default(0);
            $table->decimal('negative_mark_per_wrong', 6, 2)->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(1);
            $table->string('status', 20)->default('draft');
            $table->dateTime('opens_at')->nullable();
            $table->dateTime('closes_at')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('exam_questions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->text('question');
            $table->text('options');
            $table->unsignedTinyInteger('correct_option_index');
            $table->text('explanation')->nullable();
            $table->decimal('marks', 8, 2)->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->dateTime('created_at')->nullable();
            $table->unique(['exam_id', 'sort_order']);
        });

        Schema::create('exam_question_bank_sources', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->unsignedBigInteger('exam_question_id');
            $table->unsignedBigInteger('question_bank_item_id');
        });

        Schema::create('exam_attempts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->unsignedBigInteger('user_id');
            $table->dateTime('started_at');
            $table->dateTime('expires_at');
            $table->dateTime('submitted_at')->nullable();
            $table->decimal('score', 8, 2)->nullable();
            $table->decimal('total_marks', 8, 2)->nullable();
            $table->decimal('percentage', 6, 2)->nullable();
            $table->boolean('passed')->nullable();
            $table->string('status', 20)->default('in_progress');
            $table->text('answers_json')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
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

    private function createCourse(int $creatorId, string $slug = 'ssc-english', ?int $branchId = 10): int
    {
        return (int) DB::table('courses')->insertGetId([
            'branch_id' => $branchId,
            'title' => 'SSC English',
            'slug' => $slug,
            'status' => 'published',
            'created_by' => $creatorId,
        ]);
    }

    private function createExam(int $courseId, int $creatorId, string $status = 'published', int $duration = 30, int $maxAttempts = 1): int
    {
        return (int) DB::table('exams')->insertGetId([
            'course_id' => $courseId,
            'title' => 'SSC English Model Test',
            'description' => 'Timed MCQ test',
            'duration_minutes' => $duration,
            'total_marks' => '10.00',
            'pass_marks' => '5.00',
            'negative_mark_per_wrong' => '0.50',
            'max_attempts' => $maxAttempts,
            'status' => $status,
            'created_by' => $creatorId,
            'created_at' => now(),
        ]);
    }

    private function addQuestions(int $examId): array
    {
        $ids = [];
        foreach ([
            ['question' => 'Choose the correct verb.', 'options' => ['go', 'goes', 'going'], 'correct' => 1, 'marks' => 5],
            ['question' => 'Choose the correct article.', 'options' => ['a', 'an', 'the'], 'correct' => 1, 'marks' => 5],
        ] as $i => $question) {
            $ids[] = (int) DB::table('exam_questions')->insertGetId([
                'exam_id' => $examId,
                'question' => $question['question'],
                'options' => json_encode($question['options']),
                'correct_option_index' => $question['correct'],
                'explanation' => 'Explanation',
                'marks' => $question['marks'],
                'sort_order' => $i,
                'created_at' => now(),
            ]);
        }

        return $ids;
    }

    private function enroll(int $studentId, int $courseId): void
    {
        DB::table('course_enrollments')->insert([
            'user_id' => $studentId,
            'course_id' => $courseId,
            'status' => 'active',
        ]);
    }

    private function grant(string $role, string $permission = 'exams.manage'): void
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

    public function test_teacher_can_create_exam_add_mcq_questions_and_publish(): void
    {
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId);
        $this->login('teacher@example.test');

        $response = $this->postJson('/api/v1/exams', [
            'course_id' => $courseId,
            'title' => 'SSC Grammar Set Test',
            'description' => 'Board-style MCQ test',
            'duration_minutes' => 45,
            'pass_marks' => 5,
            'negative_mark_per_wrong' => 0.25,
            'max_attempts' => 2,
            'status' => 'draft',
        ])->assertCreated();

        $examId = (int) $response->json('data.id');
        $this->putJson('/api/v1/exams/' . $examId . '/questions', [
            'questions' => [
                ['question' => 'Choose the correct form.', 'options' => ['go', 'goes', 'going'], 'correct_option_index' => 1, 'marks' => 5],
                ['question' => 'Choose the correct article.', 'options' => ['a', 'an', 'the'], 'correct_option_index' => 1, 'marks' => 5],
            ],
        ])->assertOk()
            ->assertJsonPath('data.total_marks', 10);

        $this->patchJson('/api/v1/exams/' . $examId, ['status' => 'published'])
            ->assertOk();

        $this->assertDatabaseHas('exams', [
            'id' => $examId,
            'created_by' => $teacherId,
            'status' => 'published',
            'total_marks' => '10.00',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $teacherId,
            'action' => 'exam.questions_saved',
            'entity_id' => $examId,
        ]);
    }

    public function test_teacher_cannot_create_exam_for_another_teachers_course(): void
    {
        $teacherOne = $this->createUser('teacher-one@example.test', 'teacher', 10);
        $teacherTwo = $this->createUser('teacher-two@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherTwo, 'other-course', 10);
        $this->login('teacher-one@example.test');

        $this->postJson('/api/v1/exams', [
            'course_id' => $courseId,
            'title' => 'Unauthorized Exam',
            'duration_minutes' => 30,
            'pass_marks' => 5,
            'status' => 'draft',
        ])->assertNotFound();

        $this->assertSame(0, DB::table('exams')->count());
    }

    public function test_student_only_sees_accessible_published_exams_and_not_correct_answers(): void
    {
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId);
        $otherCourseId = $this->createCourse($teacherId, 'other-course', 10);
        $this->enroll($studentId, $courseId);
        $examId = $this->createExam($courseId, $teacherId);
        $this->addQuestions($examId);
        $otherExam = $this->createExam($otherCourseId, $teacherId);
        $this->addQuestions($otherExam);
        $draftExam = $this->createExam($courseId, $teacherId, 'draft');
        $this->addQuestions($draftExam);
        $this->login('student@example.test');

        $this->getJson('/api/v1/exams')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $examId);

        $this->getJson('/api/v1/exams/' . $examId)
            ->assertOk()
            ->assertJsonMissingPath('data.questions.0.correct_option_index')
            ->assertJsonMissingPath('data.questions.0.explanation');
    }

    public function test_student_can_start_save_and_submit_timed_exam_with_negative_marking(): void
    {
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId);
        $this->enroll($studentId, $courseId);
        $examId = $this->createExam($courseId, $teacherId);
        $questionIds = $this->addQuestions($examId);
        $this->login('student@example.test');

        $start = $this->postJson('/api/v1/exams/' . $examId . '/start')
            ->assertOk()
            ->json('data.attempt.id');
        $this->assertNotEmpty($start);

        $answers = [
            (string) $questionIds[0] => 1,
            (string) $questionIds[1] => 0,
        ];

        $this->postJson('/api/v1/exams/attempts/' . $start . '/answers', ['answers' => $answers])
            ->assertOk()
            ->assertJsonPath('data.saved_answers', 2);

        $this->postJson('/api/v1/exams/attempts/' . $start . '/submit', ['answers' => $answers])
            ->assertOk()
            ->assertJsonPath('data.score', 4.5)
            ->assertJsonPath('data.total_marks', 10)
            ->assertJsonPath('data.percentage', 45)
            ->assertJsonPath('data.passed', false);

        $this->assertDatabaseHas('exam_attempts', [
            'id' => $start,
            'status' => 'submitted',
            'score' => '4.50',
            'passed' => 0,
        ]);

        $this->postJson('/api/v1/exams/' . $examId . '/start')->assertStatus(409);
    }

    public function test_expired_exam_attempt_cannot_save_answers(): void
    {
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $courseId = $this->createCourse($teacherId);
        $this->enroll($studentId, $courseId);
        $examId = $this->createExam($courseId, $teacherId);
        $questionIds = $this->addQuestions($examId);
        $attemptId = (int) DB::table('exam_attempts')->insertGetId([
            'exam_id' => $examId,
            'user_id' => $studentId,
            'started_at' => now()->subHour(),
            'expires_at' => now()->subMinute(),
            'status' => 'in_progress',
            'created_at' => now()->subHour(),
        ]);
        $this->login('student@example.test');

        $this->postJson('/api/v1/exams/attempts/' . $attemptId . '/answers', [
            'answers' => [(string) $questionIds[0] => 1],
        ])->assertStatus(409);

        $this->assertDatabaseHas('exam_attempts', [
            'id' => $attemptId,
            'status' => 'expired',
        ]);
    }

    public function test_exam_with_attempts_cannot_be_archived(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $teacherId = $this->createUser('teacher@example.test', 'teacher', 10);
        $studentId = $this->createUser('student@example.test', 'student', 10);
        $courseId = $this->createCourse($teacherId);
        $examId = $this->createExam($courseId, $teacherId);
        $this->addQuestions($examId);
        DB::table('exam_attempts')->insert([
            'exam_id' => $examId,
            'user_id' => $studentId,
            'started_at' => now(),
            'expires_at' => now()->addMinutes(30),
            'status' => 'in_progress',
            'created_at' => now(),
        ]);
        $this->grant('admin');
        $this->login('admin@example.test');

        $this->deleteJson('/api/v1/exams/' . $examId)->assertStatus(409);
        $this->assertDatabaseHas('exams', [
            'id' => $examId,
            'deleted_at' => null,
        ]);
    }
    public function test_branch_manager_attempt_history_is_scoped_to_their_branch(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 10);
        $studentOne = $this->createUser('student-one@example.test', 'student', 10);
        $studentTwo = $this->createUser('student-two@example.test', 'student', 20);
        $this->grant('branch_manager');

        $courseOne = $this->createCourse($managerId, 'branch-one-course', 10);
        $courseTwo = $this->createCourse($managerId, 'branch-two-course', 20);
        $examOne = $this->createExam($courseOne, $managerId);
        $examTwo = $this->createExam($courseTwo, $managerId);

        $attemptOne = (int) DB::table('exam_attempts')->insertGetId([
            'exam_id' => $examOne,
            'user_id' => $studentOne,
            'started_at' => now(),
            'expires_at' => now()->addMinutes(30),
            'status' => 'submitted',
            'created_at' => now(),
        ]);
        DB::table('exam_attempts')->insert([
            'exam_id' => $examTwo,
            'user_id' => $studentTwo,
            'started_at' => now(),
            'expires_at' => now()->addMinutes(30),
            'status' => 'submitted',
            'created_at' => now(),
        ]);

        $this->login('manager@example.test');
        $this->getJson('/api/v1/exams/attempts')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $attemptOne);
    }

    public function test_active_subscription_course_selection_grants_course_exam_access(): void
    {
        $adminId = $this->createUser('admin@example.test', 'super_admin');
        $studentId = $this->createUser('subscriber@example.test', 'student', 10);
        $courseId = $this->createCourse($adminId, 'subscription-course', 10);
        $examId = $this->createExam($courseId, $adminId, 'published');
        $this->addQuestions($examId);
        $subscriptionId = (int) DB::table('user_subscriptions')->insertGetId([
            'user_id' => $studentId,
            'status' => 'active',
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addDays(10),
        ]);
        DB::table('user_subscription_courses')->insert([
            'subscription_id' => $subscriptionId,
            'user_id' => $studentId,
            'course_id' => $courseId,
            'branch_id' => 10,
            'status' => 'active',
        ]);
        $this->login('subscriber@example.test');

        $this->getJson('/api/v1/exams')
            ->assertOk()
            ->assertJsonFragment(['id' => $examId]);
        $this->getJson('/api/v1/exams/' . $examId)->assertOk();
        $this->postJson('/api/v1/exams/' . $examId . '/start')->assertOk();
    }

}
