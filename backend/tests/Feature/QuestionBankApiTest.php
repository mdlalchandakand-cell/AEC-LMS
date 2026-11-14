<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class QuestionBankApiTest extends TestCase
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
            $table->string('slug', 200);
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

        Schema::create('question_bank_items', function (Blueprint $table): void {
            $table->id();
            $table->string('category', 120)->default('General');
            $table->text('question_text');
            $table->text('options');
            $table->unsignedTinyInteger('correct_option_index');
            $table->text('explanation')->nullable();
            $table->decimal('marks', 8, 2)->default(1);
            $table->string('difficulty', 20)->default('intermediate');
            $table->text('tags')->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
        });

        Schema::create('exams', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id')->nullable();
            $table->string('title', 180);
            $table->decimal('total_marks', 8, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('updated_at')->nullable();
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

        Schema::create('exam_attempts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->unsignedBigInteger('user_id');
            $table->dateTime('started_at');
            $table->dateTime('expires_at');
            $table->string('status', 20)->default('in_progress');
        });

        Schema::create('exam_question_bank_sources', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->unsignedBigInteger('exam_question_id');
            $table->unsignedBigInteger('question_bank_item_id');
            $table->dateTime('imported_at')->nullable();
            $table->unique(['exam_id', 'question_bank_item_id']);
            $table->unique(['exam_question_id']);
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

    private function questionPayload(string $question = 'Choose the correct verb.'): array
    {
        return [
            'category' => 'Grammar',
            'question_text' => $question,
            'options' => ['go', 'goes', 'going'],
            'correct_option_index' => 1,
            'explanation' => 'A singular subject takes goes.',
            'marks' => 2,
            'difficulty' => 'intermediate',
            'tags' => ['SSC', 'verb'],
            'status' => 'published',
        ];
    }

    public function test_admin_can_create_and_list_reusable_question_bank_items(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $this->grant('admin', 'question_bank.manage');
        $this->login('admin@example.test');

        $response = $this->postJson('/api/v1/question-bank', $this->questionPayload())
            ->assertCreated();

        $id = (int) $response->json('data.id');
        $this->getJson('/api/v1/question-bank')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $id)
            ->assertJsonPath('data.items.0.options.1', 'goes')
            ->assertJsonPath('data.items.0.correct_option_index', 1)
            ->assertJsonPath('data.items.0.tags.0', 'SSC');

        $this->assertDatabaseHas('question_bank_items', [
            'id' => $id,
            'created_by' => $adminId,
            'status' => 'published',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $adminId,
            'action' => 'question_bank.created',
            'entity_id' => $id,
        ]);
    }

    public function test_question_bank_rejects_invalid_correct_option_index(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $this->grant('admin', 'question_bank.manage');
        $this->login('admin@example.test');

        $this->postJson('/api/v1/question-bank', array_merge($this->questionPayload(), [
            'correct_option_index' => 3,
        ]))->assertUnprocessable();

        $this->assertSame(0, DB::table('question_bank_items')->count());
    }

    public function test_admin_can_import_published_question_bank_items_into_draft_exam(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $this->grant('admin', 'question_bank.manage');
        $this->grant('admin', 'exams.manage');
        $questionOne = (int) DB::table('question_bank_items')->insertGetId([
            'category' => 'Grammar',
            'question_text' => 'Question one',
            'options' => json_encode(['A', 'B']),
            'correct_option_index' => 1,
            'marks' => '2.00',
            'status' => 'published',
            'created_by' => $adminId,
            'created_at' => now(),
        ]);
        $questionTwo = (int) DB::table('question_bank_items')->insertGetId([
            'category' => 'Grammar',
            'question_text' => 'Question two',
            'options' => json_encode(['A', 'B', 'C']),
            'correct_option_index' => 0,
            'marks' => '3.00',
            'status' => 'published',
            'created_by' => $adminId,
            'created_at' => now(),
        ]);
        $examId = (int) DB::table('exams')->insertGetId([
            'title' => 'Draft Model Test',
            'total_marks' => '0.00',
            'status' => 'draft',
        ]);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/question-bank/add-to-exam', [
            'exam_id' => $examId,
            'question_bank_ids' => [$questionOne, $questionTwo],
        ])->assertOk()
            ->assertJsonPath('data.imported_count', 2)
            ->assertJsonPath('data.total_marks', 5);

        $this->assertDatabaseHas('exams', [
            'id' => $examId,
            'total_marks' => '5.00',
        ]);
        $this->assertSame(2, DB::table('exam_question_bank_sources')->where('exam_id', $examId)->count());
        $this->assertSame(2, DB::table('exam_questions')->where('exam_id', $examId)->count());

        $this->postJson('/api/v1/question-bank/add-to-exam', [
            'exam_id' => $examId,
            'question_bank_ids' => [$questionOne],
        ])->assertStatus(409);
    }

    public function test_question_used_in_exam_cannot_be_archived(): void
    {
        $this->createUser('admin@example.test', 'admin');
        $this->grant('admin', 'question_bank.manage');
        $questionId = (int) DB::table('question_bank_items')->insertGetId([
            'category' => 'Grammar',
            'question_text' => 'Linked question',
            'options' => json_encode(['A', 'B']),
            'correct_option_index' => 0,
            'marks' => '1.00',
            'status' => 'published',
            'created_by' => 1,
            'created_at' => now(),
        ]);
        DB::table('exam_question_bank_sources')->insert([
            'exam_id' => 10,
            'exam_question_id' => 20,
            'question_bank_item_id' => $questionId,
            'imported_at' => now(),
        ]);
        $this->login('admin@example.test');

        $this->deleteJson('/api/v1/question-bank/' . $questionId)->assertStatus(409);
        $this->assertDatabaseHas('question_bank_items', [
            'id' => $questionId,
            'deleted_at' => null,
            'status' => 'published',
        ]);
    }

    public function test_student_cannot_access_question_bank(): void
    {
        $this->createUser('student@example.test', 'student');
        $this->login('student@example.test');

        $this->getJson('/api/v1/question-bank')->assertForbidden();
    }
    public function test_question_bank_import_rejects_exam_outside_branch_manager_scope(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager');
        DB::table('users')->where('id', $managerId)->update(['branch_id' => 10]);
        $this->grant('branch_manager', 'exams.manage');
        $this->grant('branch_manager', 'question_bank.manage');

        $courseId = (int) DB::table('courses')->insertGetId([
            'branch_id' => 20,
            'title' => 'Other Branch Course',
            'slug' => 'other-branch-course',
            'status' => 'published',
            'created_by' => $managerId,
        ]);
        $examId = (int) DB::table('exams')->insertGetId([
            'course_id' => $courseId,
            'title' => 'Other Branch Draft Exam',
            'total_marks' => '0.00',
            'status' => 'draft',
        ]);
        $questionId = (int) DB::table('question_bank_items')->insertGetId([
            'category' => 'Grammar',
            'question_text' => 'A reusable question',
            'options' => json_encode(['A', 'B']),
            'correct_option_index' => 0,
            'marks' => '1.00',
            'status' => 'published',
            'created_by' => $managerId,
            'created_at' => now(),
        ]);

        $this->login('manager@example.test');
        $this->postJson('/api/v1/question-bank/add-to-exam', [
            'exam_id' => $examId,
            'question_bank_ids' => [$questionId],
        ])->assertNotFound();

        $this->assertSame(0, DB::table('exam_questions')->where('exam_id', $examId)->count());
    }

    public function test_question_bank_import_validates_all_items_before_writing_any_questions(): void
    {
        $adminId = $this->createUser('admin@example.test', 'admin');
        $this->grant('admin', 'question_bank.manage');
        $this->grant('admin', 'exams.manage');
        $questionId = (int) DB::table('question_bank_items')->insertGetId([
            'category' => 'Grammar',
            'question_text' => 'Valid question',
            'options' => json_encode(['A', 'B']),
            'correct_option_index' => 0,
            'marks' => '1.00',
            'status' => 'published',
            'created_by' => $adminId,
            'created_at' => now(),
        ]);
        $examId = (int) DB::table('exams')->insertGetId([
            'title' => 'Atomic Import Exam',
            'total_marks' => '0.00',
            'status' => 'draft',
        ]);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/question-bank/add-to-exam', [
            'exam_id' => $examId,
            'question_bank_ids' => [$questionId, 99999],
        ])->assertNotFound();

        $this->assertSame(0, DB::table('exam_questions')->where('exam_id', $examId)->count());
        $this->assertSame(0, DB::table('exam_question_bank_sources')->where('exam_id', $examId)->count());
        $this->assertDatabaseHas('exams', ['id' => $examId, 'total_marks' => '0.00']);
    }

}
