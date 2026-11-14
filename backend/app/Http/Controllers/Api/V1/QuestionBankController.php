<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestionBankController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!LmsPermission::allows($request->user(), 'question_bank.manage')) {
            return $this->forbidden('You do not have permission to view the question bank.');
        }

        $rows = DB::table('question_bank_items')
            ->whereNull('deleted_at')
            ->orderBy('category')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(1000)
            ->get();

        $items = $rows->map(fn ($row): array => $this->decodeQuestion($row))->all();

        return response()->json(['success' => true, 'message' => 'Question bank loaded.', 'data' => ['items' => $items]]);
    }

    public function show(Request $request, int $question): JsonResponse
    {
        if (!LmsPermission::allows($request->user(), 'question_bank.manage')) {
            return $this->forbidden('You do not have permission to view the question bank.');
        }

        $row = DB::table('question_bank_items')->where('id', $question)->whereNull('deleted_at')->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Question not found.', 'error' => 'Not found.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Question loaded.', 'data' => $this->decodeQuestion($row)]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'question_bank.manage')) {
            return $this->forbidden('You do not have permission to manage the question bank.');
        }

        $payload = $this->validatePayload($request);
        $id = (int) DB::table('question_bank_items')->insertGetId([
            'category' => $payload['category'],
            'question_text' => $payload['question_text'],
            'options' => json_encode($payload['options'], JSON_UNESCAPED_UNICODE),
            'correct_option_index' => $payload['correct_option_index'],
            'explanation' => $payload['explanation'],
            'marks' => $payload['marks'],
            'difficulty' => $payload['difficulty'],
            'tags' => json_encode($payload['tags'], JSON_UNESCAPED_UNICODE),
            'status' => $payload['status'],
            'created_by' => (int) $actor->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'question_bank.created', $id, []);

        return response()->json(['success' => true, 'message' => 'Question added to bank.', 'data' => ['id' => $id]], 201);
    }

    public function update(Request $request, int $question): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'question_bank.manage')) {
            return $this->forbidden('You do not have permission to manage the question bank.');
        }

        $row = DB::table('question_bank_items')->where('id', $question)->whereNull('deleted_at')->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Question not found.', 'error' => 'Not found.'], 404);
        }

        $payload = $this->validatePayload($request);
        if ($payload['status'] !== 'published'
            && DB::table('exam_question_bank_sources')->where('question_bank_item_id', $question)->exists()) {
            return response()->json(['success' => false, 'message' => 'A question already used in an exam must remain published for safe exam editing.', 'error' => 'Conflict.'], 409);
        }

        DB::table('question_bank_items')->where('id', $question)->update([
            'category' => $payload['category'],
            'question_text' => $payload['question_text'],
            'options' => json_encode($payload['options'], JSON_UNESCAPED_UNICODE),
            'correct_option_index' => $payload['correct_option_index'],
            'explanation' => $payload['explanation'],
            'marks' => $payload['marks'],
            'difficulty' => $payload['difficulty'],
            'tags' => json_encode($payload['tags'], JSON_UNESCAPED_UNICODE),
            'status' => $payload['status'],
            'updated_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'question_bank.updated', $question, []);

        return response()->json(['success' => true, 'message' => 'Question updated.', 'data' => ['id' => $question]]);
    }

    public function destroy(Request $request, int $question): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'question_bank.manage')) {
            return $this->forbidden('You do not have permission to manage the question bank.');
        }

        $result = DB::transaction(function () use ($request, $actor, $question): array|JsonResponse {
            $row = DB::table('question_bank_items')->where('id', $question)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row) {
                return response()->json(['success' => false, 'message' => 'Question not found.', 'error' => 'Not found.'], 404);
            }
            if (DB::table('exam_question_bank_sources')->where('question_bank_item_id', $question)->exists()) {
                return response()->json(['success' => false, 'message' => 'A question already used in an exam cannot be archived.', 'error' => 'Conflict.'], 409);
            }

            DB::table('question_bank_items')->where('id', $question)->update([
                'status' => 'archived',
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit($request, (int) $actor->id, 'question_bank.archived', $question, []);

            return ['id' => $question];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Question archived.', 'data' => $result]);
    }

    public function addToExam(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'exams.manage') || !LmsPermission::allows($actor, 'question_bank.manage')) {
            return $this->forbidden('Both exam management and question bank permissions are required.');
        }

        $validated = $request->validate([
            'exam_id' => ['required', 'integer', 'min:1'],
            'question_bank_ids' => ['required', 'array', 'min:1', 'max:200'],
            'question_bank_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
        ]);

        $result = DB::transaction(function () use ($request, $actor, $validated): array|JsonResponse {
            $exam = DB::table('exams')->where('id', $validated['exam_id'])->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$exam || !$this->canManageExam($actor, $exam)) {
                return response()->json(['success' => false, 'message' => 'Exam not found or outside your permitted scope.', 'error' => 'Not found.'], 404);
            }
            if ($actor->role === 'branch_manager') {
                if (!$this->hasActiveBranch($actor->branch_id) || $exam->course_id === null) {
                    return response()->json(['success' => false, 'message' => 'Exam not found in your permitted branch.', 'error' => 'Not found.'], 404);
                }
                $courseBranch = DB::table('courses')
                    ->where('id', $exam->course_id)
                    ->whereNull('deleted_at')
                    ->value('branch_id');
                if ($courseBranch === null || (int) $courseBranch !== (int) $actor->branch_id) {
                    return response()->json(['success' => false, 'message' => 'Exam not found in your permitted branch.', 'error' => 'Not found.'], 404);
                }
            }

            if ($exam->status !== 'draft') {
                return response()->json(['success' => false, 'message' => 'Question bank items can only be added to draft exams.', 'error' => 'Conflict.'], 409);
            }
            if (DB::table('exam_attempts')->where('exam_id', $exam->id)->exists()) {
                return response()->json(['success' => false, 'message' => 'Questions cannot be changed after an attempt has started.', 'error' => 'Conflict.'], 409);
            }

            $ids = array_map('intval', $validated['question_bank_ids']);
            $existing = DB::table('exam_question_bank_sources')
                ->where('exam_id', $exam->id)
                ->whereIn('question_bank_item_id', $ids)
                ->exists();
            if ($existing) {
                return response()->json(['success' => false, 'message' => 'A selected question is already linked to this exam.', 'error' => 'Conflict.'], 409);
            }

            $questions = DB::table('question_bank_items')
                ->whereIn('id', $ids)
                ->whereNull('deleted_at')
                ->where('status', 'published')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($questions->count() !== count($ids)) {
                return response()->json(['success' => false, 'message' => 'One or more published question bank items were not found.', 'error' => 'Not found.'], 404);
            }

            $existingQuestionCount = DB::table('exam_questions')->where('exam_id', $exam->id)->count();
            if ($existingQuestionCount + count($ids) > 200) {
                return response()->json(['success' => false, 'message' => 'An exam cannot contain more than 200 questions.', 'error' => 'Validation failed.'], 422);
            }
            $sortOrder = $existingQuestionCount > 0
                ? (int) DB::table('exam_questions')->where('exam_id', $exam->id)->max('sort_order') + 1
                : 0;
            $totalMarks = (float) $exam->total_marks;
            foreach ($ids as $id) {
                $question = $questions->get($id);
                $examQuestionId = (int) DB::table('exam_questions')->insertGetId([
                    'exam_id' => (int) $exam->id,
                    'question' => $question->question_text,
                    'options' => $question->options,
                    'correct_option_index' => (int) $question->correct_option_index,
                    'explanation' => $question->explanation,
                    'marks' => $question->marks,
                    'sort_order' => $sortOrder,
                    'created_at' => now(),
                ]);
                DB::table('exam_question_bank_sources')->insert([
                    'exam_id' => (int) $exam->id,
                    'exam_question_id' => $examQuestionId,
                    'question_bank_item_id' => $id,
                    'imported_at' => now(),
                ]);
                $totalMarks += (float) $question->marks;
                $sortOrder++;
            }

            DB::table('exams')->where('id', $exam->id)->update([
                'total_marks' => round($totalMarks, 2),
                'updated_at' => now(),
            ]);
            $this->audit($request, (int) $actor->id, 'question_bank.imported_to_exam', (int) $exam->id, [
                'question_bank_ids' => $ids,
                'total_marks' => round($totalMarks, 2),
            ]);

            return ['exam_id' => (int) $exam->id, 'imported_count' => count($ids), 'total_marks' => round($totalMarks, 2)];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Question bank items added to exam.', 'data' => $result]);
    }

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:120'],
            'question_text' => ['required', 'string', 'max:5000'],
            'options' => ['required', 'array', 'min:2', 'max:8'],
            'options.*' => ['required', 'string', 'max:1000'],
            'correct_option_index' => ['required', 'integer', 'min:0'],
            'explanation' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'marks' => ['sometimes', 'numeric', 'gt:0', 'max:1000'],
            'difficulty' => ['sometimes', 'in:beginner,intermediate,advanced'],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
            'status' => ['sometimes', 'in:draft,published,archived'],
        ]);

        $options = array_map(fn ($option): string => trim($option), $validated['options']);
        foreach ($options as $option) {
            if ($option === '') {
                abort(422, 'Each option must be non-empty text.');
            }
        }
        if ($validated['correct_option_index'] >= count($options)) {
            abort(422, 'Correct option index is invalid.');
        }

        $tags = array_values(array_unique(array_map(fn ($tag): string => trim($tag), $validated['tags'] ?? [])));
        if (in_array('', $tags, true)) {
            abort(422, 'Tags must not be empty.');
        }

        return [
            'category' => trim($validated['category']),
            'question_text' => trim($validated['question_text']),
            'options' => $options,
            'correct_option_index' => (int) $validated['correct_option_index'],
            'explanation' => trim((string) ($validated['explanation'] ?? '')) ?: null,
            'marks' => round((float) ($validated['marks'] ?? 1), 2),
            'difficulty' => $validated['difficulty'] ?? 'intermediate',
            'tags' => $tags,
            'status' => $validated['status'] ?? 'draft',
        ];
    }

    private function decodeQuestion(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'category' => $row->category,
            'question_text' => $row->question_text,
            'options' => json_decode((string) $row->options, true) ?: [],
            'correct_option_index' => (int) $row->correct_option_index,
            'explanation' => $row->explanation,
            'marks' => (float) $row->marks,
            'difficulty' => $row->difficulty,
            'tags' => $row->tags ? (json_decode((string) $row->tags, true) ?: []) : [],
            'status' => $row->status,
            'created_at' => $row->created_at,
        ];
    }

    private function canManageExam($actor, object $exam): bool
    {
        if (!LmsPermission::allows($actor, 'exams.manage')) {
            return false;
        }
        if ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id) || $exam->course_id === null) {
                return false;
            }
            $course = DB::table('courses')
                ->where('id', $exam->course_id)
                ->whereNull('deleted_at')
                ->first(['branch_id']);
            return $course !== null && (int) $course->branch_id === (int) $actor->branch_id;
        }
        if ($actor->role === 'teacher') {
            if ($exam->course_id === null) {
                return false;
            }
            return DB::table('courses')
                ->where('id', $exam->course_id)
                ->whereNull('deleted_at')
                ->where(function ($scope) use ($actor): void {
                    $scope->where('created_by', $actor->id)
                        ->orWhereExists(function ($assignment) use ($actor): void {
                            $assignment->selectRaw('1')
                                ->from('teacher_course_assignments')
                                ->whereColumn('teacher_course_assignments.course_id', 'courses.id')
                                ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                                ->where('teacher_course_assignments.is_active', 1);
                        });
                })
                ->exists();
        }

        return true;
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function audit(Request $request, int $actorId, string $event, int $entityId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'question_bank_item',
            'entity_id' => $entityId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }
}
