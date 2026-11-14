<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $canManage = $this->canManageAnyExam($actor);
        $query = DB::table('exams as exams')
            ->leftJoin('courses', 'courses.id', '=', 'exams.course_id')
            ->select([
                'exams.id',
                'exams.course_id',
                'courses.title as course_title',
                'exams.title',
                'exams.description',
                'exams.duration_minutes',
                'exams.total_marks',
                'exams.pass_marks',
                'exams.negative_mark_per_wrong',
                'exams.max_attempts',
                'exams.status',
                'exams.opens_at',
                'exams.closes_at',
                'exams.created_at',
            ])
            ->selectSub(function ($sub): void {
                $sub->from('exam_questions')
                    ->whereColumn('exam_questions.exam_id', 'exams.id')
                    ->selectRaw('COUNT(*)');
            }, 'question_count')
            ->whereNull('exams.deleted_at');

        if (!$canManage) {
            $query->where('exams.status', 'published')
                ->where(function ($window): void {
                    $window->whereNull('exams.opens_at')->orWhere('exams.opens_at', '<=', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
                })
                ->where(function ($window): void {
                    $window->whereNull('exams.closes_at')->orWhere('exams.closes_at', '>=', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
                })
                ->where(function ($course) use ($actor): void {
                    $course->whereNull('exams.course_id')
                        ->orWhereExists(function ($enrollment) use ($actor): void {
                            $enrollment->selectRaw('1')
                                ->from('course_enrollments')
                                ->join('courses as enrolled_course', 'enrolled_course.id', '=', 'course_enrollments.course_id')
                                ->whereColumn('course_enrollments.course_id', 'exams.course_id')
                                ->where('course_enrollments.user_id', $actor->id)
                                ->whereIn('course_enrollments.status', ['active', 'completed'])
                                ->where(function ($window): void {
                                    $window->whereNull('course_enrollments.ends_at')
                                        ->orWhere('course_enrollments.ends_at', '>', now('Asia/Dhaka')->format('Y-m-d H:i:s'));
                                })
                                ->where('enrolled_course.status', 'published')
                                ->whereNull('enrolled_course.deleted_at')
                                ->where(function ($branch): void {
                                    $branch->whereNull('enrolled_course.branch_id')
                                        ->orWhereExists(function ($active): void {
                                            $active->selectRaw('1')
                                                ->from('branches')
                                                ->whereColumn('branches.id', 'enrolled_course.branch_id')
                                                ->where('branches.is_active', 1);
                                        });
                                });
                        })
                        ->orWhereExists(function ($subscription) use ($actor): void {
                            $now = now('Asia/Dhaka')->format('Y-m-d H:i:s');
                            $subscription->selectRaw('1')
                                ->from('user_subscription_courses as selected')
                                ->join('user_subscriptions', 'user_subscriptions.id', '=', 'selected.subscription_id')
                                ->whereColumn('selected.course_id', 'exams.course_id')
                                ->where('selected.user_id', $actor->id)
                                ->where('selected.status', 'active')
                                ->where('user_subscriptions.status', 'active')
                                ->where(function ($starts) use ($now): void {
                                    $starts->whereNull('user_subscriptions.starts_at')
                                        ->orWhere('user_subscriptions.starts_at', '<=', $now);
                                })
                                ->where(function ($ends) use ($now): void {
                                    $ends->whereNull('user_subscriptions.ends_at')
                                        ->orWhere('user_subscriptions.ends_at', '>', $now);
                                });
                        });
                });
        } else {
            if ($actor->role === 'teacher') {
                $query->whereNotNull('exams.course_id')
                    ->whereExists(function ($owned) use ($actor): void {
                        $owned->selectRaw('1')
                            ->from('courses as managed_course')
                            ->whereColumn('managed_course.id', 'exams.course_id')
                            ->where(function ($scope) use ($actor): void {
                                $scope->where(function ($creator) use ($actor): void {
                                    $creator->where('managed_course.created_by', $actor->id);
                                    if ($actor->branch_id === null) {
                                        $creator->whereNull('managed_course.branch_id');
                                    } else {
                                        $creator->where('managed_course.branch_id', $actor->branch_id);
                                    }
                                })->orWhereExists(function ($assignment) use ($actor): void {
                                    $assignment->selectRaw('1')
                                        ->from('teacher_course_assignments')
                                        ->whereColumn('teacher_course_assignments.course_id', 'managed_course.id')
                                        ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                                        ->where('teacher_course_assignments.is_active', 1);
                                });
                            });
                    });
            } elseif ($actor->role === 'branch_manager') {
                if (!$this->hasActiveBranch($actor->branch_id)) {
                    return $this->forbidden('Your account is not assigned to an active branch.');
                }
                $query->where('courses.branch_id', $actor->branch_id);
            }
        }

        $items = $query->orderByDesc('exams.created_at')->orderByDesc('exams.id')->limit(500)->get();

        return response()->json(['success' => true, 'message' => 'Exams loaded.', 'data' => ['items' => $items]]);
    }

    public function show(Request $request, int $exam): JsonResponse
    {
        $actor = $request->user();
        $row = DB::table('exams as exams')
            ->leftJoin('courses', 'courses.id', '=', 'exams.course_id')
            ->where('exams.id', $exam)
            ->whereNull('exams.deleted_at')
            ->first(['exams.*', 'courses.title as course_title', 'courses.status as course_status', 'courses.deleted_at as course_deleted_at', 'courses.branch_id as course_branch_id']);

        if (!$row || !$this->examAccessible($actor, $row)) {
            return response()->json(['success' => false, 'message' => 'Exam not found or not available to this account.', 'error' => 'Not found.'], 404);
        }

        $canManage = $this->canManageExam($actor, $row);
        $questions = DB::table('exam_questions')
            ->where('exam_id', $exam)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $items = [];
        foreach ($questions as $question) {
            $options = json_decode((string) $question->options, true) ?: [];
            $item = [
                'id' => (int) $question->id,
                'question' => $question->question,
                'options' => $options,
                'marks' => (float) $question->marks,
                'sort_order' => (int) $question->sort_order,
            ];
            if ($canManage) {
                $item['correct_option_index'] = (int) $question->correct_option_index;
                $item['explanation'] = $question->explanation;
            }
            $items[] = $item;
        }

        $row->questions = $items;
        unset($row->course_status, $row->course_deleted_at, $row->course_branch_id);

        return response()->json(['success' => true, 'message' => 'Exam loaded.', 'data' => $row]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$this->canManageAnyExam($actor)) {
            return $this->forbidden('You do not have permission to create exams.');
        }

        $payload = $this->validatePayload($request, true);
        if ($payload['course_id'] === null) {
            if (!LmsPermission::allows($actor, 'exams.manage')) {
                return $this->forbidden('Only an authorized exam manager can create a public exam.');
            }
        } else {
            $course = DB::table('courses')->where('id', $payload['course_id'])->whereNull('deleted_at')->first();
            if (!$course || !$this->canManageCourse($actor, $course)) {
                return response()->json(['success' => false, 'message' => 'Course not found or outside your permitted scope.', 'error' => 'Not found.'], 404);
            }
        }

        if ($payload['status'] === 'published') {
            return response()->json(['success' => false, 'message' => 'Create the exam as a draft, add questions, then publish it.', 'error' => 'Validation failed.'], 422);
        }

        $id = (int) DB::table('exams')->insertGetId([
            'course_id' => $payload['course_id'],
            'title' => $payload['title'],
            'description' => $payload['description'],
            'duration_minutes' => $payload['duration_minutes'],
            'total_marks' => 0,
            'pass_marks' => $payload['pass_marks'],
            'negative_mark_per_wrong' => $payload['negative_mark_per_wrong'],
            'max_attempts' => $payload['max_attempts'],
            'status' => $payload['status'],
            'opens_at' => $payload['opens_at'],
            'closes_at' => $payload['closes_at'],
            'created_by' => (int) $actor->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'exam.created', $id, ['course_id' => $payload['course_id']]);

        return response()->json(['success' => true, 'message' => 'Exam created as draft.', 'data' => ['id' => $id]], 201);
    }

    public function update(Request $request, int $exam): JsonResponse
    {
        $actor = $request->user();
        $result = DB::transaction(function () use ($request, $actor, $exam): array|JsonResponse {
            $row = DB::table('exams')->where('id', $exam)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row || !$this->canManageExam($actor, $row)) {
                return response()->json(['success' => false, 'message' => 'Exam not found.', 'error' => 'Not found.'], 404);
            }

            if (DB::table('exam_attempts')->where('exam_id', $exam)->exists()) {
                return response()->json(['success' => false, 'message' => 'Exam settings cannot be changed after attempts have started.', 'error' => 'Conflict.'], 409);
            }

            $payload = $this->validatePayload($request, false, $row);
            if ($payload['course_id'] === null) {
                if (!LmsPermission::allows($actor, 'exams.manage')) {
                    return $this->forbidden('Only an authorized exam manager can manage a public exam.');
                }
            } else {
                $course = DB::table('courses')->where('id', $payload['course_id'])->whereNull('deleted_at')->first();
                if (!$course || !$this->canManageCourse($actor, $course)) {
                    return response()->json(['success' => false, 'message' => 'Course not found or outside your permitted scope.', 'error' => 'Not found.'], 404);
                }
            }

            $questionCount = DB::table('exam_questions')->where('exam_id', $exam)->count();
            $totalMarks = (float) $row->total_marks;
            if ($payload['status'] === 'published' && ($questionCount < 1 || $totalMarks <= 0)) {
                return response()->json(['success' => false, 'message' => 'An exam needs at least one saved question before it can be published.', 'error' => 'Validation failed.'], 422);
            }
            if ($payload['status'] === 'published' && $payload['pass_marks'] > $totalMarks) {
                return response()->json(['success' => false, 'message' => 'Pass marks cannot exceed the exam total marks.', 'error' => 'Validation failed.'], 422);
            }

            DB::table('exams')->where('id', $exam)->update([
                'course_id' => $payload['course_id'],
                'title' => $payload['title'],
                'description' => $payload['description'],
                'duration_minutes' => $payload['duration_minutes'],
                'pass_marks' => $payload['pass_marks'],
                'negative_mark_per_wrong' => $payload['negative_mark_per_wrong'],
                'max_attempts' => $payload['max_attempts'],
                'status' => $payload['status'],
                'opens_at' => $payload['opens_at'],
                'closes_at' => $payload['closes_at'],
                'updated_at' => now(),
            ]);
            $this->audit($request, (int) $actor->id, 'exam.updated', $exam, ['status' => $payload['status']]);

            return ['id' => $exam];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam updated.', 'data' => $result]);
    }

    public function saveQuestions(Request $request, int $exam): JsonResponse
    {
        $actor = $request->user();
        $questions = $request->input('questions');
        if (!is_array($questions) || count($questions) > 200) {
            return response()->json(['success' => false, 'message' => 'Questions must be an array of up to 200 items.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $exam, $questions): array|JsonResponse {
            $row = DB::table('exams')->where('id', $exam)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row || !$this->canManageExam($actor, $row)) {
                return response()->json(['success' => false, 'message' => 'Exam not found.', 'error' => 'Not found.'], 404);
            }
            if (DB::table('exam_attempts')->where('exam_id', $exam)->exists()) {
                return response()->json(['success' => false, 'message' => 'Questions cannot be changed after an attempt has started.', 'error' => 'Conflict.'], 409);
            }

            $normalized = [];
            $totalMarks = 0.0;
            foreach ($questions as $index => $question) {
                if (!is_array($question)) {
                    return response()->json(['success' => false, 'message' => 'Each question must be an object.', 'error' => 'Validation failed.'], 422);
                }
                $text = trim((string) ($question['question'] ?? ''));
                $options = $question['options'] ?? null;
                $correct = filter_var($question['correct_option_index'] ?? null, FILTER_VALIDATE_INT);
                $marks = $question['marks'] ?? 1;
                $explanation = trim((string) ($question['explanation'] ?? ''));
                if ($text === '' || mb_strlen($text) > 5000 || !is_array($options) || count($options) < 2 || count($options) > 8) {
                    return response()->json(['success' => false, 'message' => 'Question text and 2–8 options are required.', 'error' => 'Validation failed.'], 422);
                }
                $cleanOptions = [];
                foreach ($options as $option) {
                    if (!is_string($option) || trim($option) === '' || mb_strlen($option) > 1000) {
                        return response()->json(['success' => false, 'message' => 'Every option must be non-empty text up to 1,000 characters.', 'error' => 'Validation failed.'], 422);
                    }
                    $cleanOptions[] = trim($option);
                }
                if ($correct === false || $correct < 0 || $correct >= count($cleanOptions)
                    || !is_numeric($marks) || (float) $marks <= 0 || (float) $marks > 1000
                    || mb_strlen($explanation) > 10000) {
                    return response()->json(['success' => false, 'message' => 'Correct option, marks or explanation is invalid.', 'error' => 'Validation failed.'], 422);
                }
                $markValue = round((float) $marks, 2);
                $totalMarks += $markValue;
                $normalized[] = [
                    'question' => $text,
                    'options' => json_encode($cleanOptions, JSON_UNESCAPED_UNICODE),
                    'correct_option_index' => $correct,
                    'explanation' => $explanation !== '' ? $explanation : null,
                    'marks' => $markValue,
                    'sort_order' => count($normalized),
                ];
            }

            DB::table('exam_questions')->where('exam_id', $exam)->delete();
            if ($normalized !== []) {
                $now = now();
                DB::table('exam_questions')->insert(array_map(function (array $question) use ($exam, $now): array {
                    return $question + ['exam_id' => $exam, 'created_at' => $now];
                }, $normalized));
            }
            DB::table('exams')->where('id', $exam)->update([
                'total_marks' => round($totalMarks, 2),
                'updated_at' => now(),
            ]);
            $this->audit($request, (int) $actor->id, 'exam.questions_saved', $exam, [
                'question_count' => count($normalized),
                'total_marks' => round($totalMarks, 2),
            ]);

            return ['id' => $exam, 'question_count' => count($normalized), 'total_marks' => round($totalMarks, 2)];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam questions saved.', 'data' => $result]);
    }

    public function attempts(Request $request): JsonResponse
    {
        $actor = $request->user();
        $canManage = $this->canManageAnyExam($actor);
        $query = DB::table('exam_attempts as attempts')
            ->join('exams', 'exams.id', '=', 'attempts.exam_id')
            ->leftJoin('courses', 'courses.id', '=', 'exams.course_id')
            ->join('users', 'users.id', '=', 'attempts.user_id')
            ->select([
                'attempts.id',
                'attempts.exam_id',
                'exams.title as exam_title',
                'attempts.user_id',
                'users.name as student_name',
                'attempts.started_at',
                'attempts.expires_at',
                'attempts.submitted_at',
                'attempts.score',
                'attempts.total_marks',
                'attempts.percentage',
                'attempts.passed',
                'attempts.status',
            ]);

        if (!$canManage) {
            $query->where('attempts.user_id', $actor->id);
        } elseif ($actor->role === 'teacher') {
            $query->whereExists(function ($owned) use ($actor): void {
                $owned->selectRaw('1')
                    ->from('courses')
                    ->whereColumn('courses.id', 'exams.course_id')
                    ->where(function ($scope) use ($actor): void {
                        $scope->where(function ($creator) use ($actor): void {
                            $creator->where('courses.created_by', $actor->id);
                            if ($actor->branch_id === null) {
                                $creator->whereNull('courses.branch_id');
                            } else {
                                $creator->where('courses.branch_id', $actor->branch_id);
                            }
                        })->orWhereExists(function ($assignment) use ($actor): void {
                            $assignment->selectRaw('1')
                                ->from('teacher_course_assignments')
                                ->whereColumn('teacher_course_assignments.course_id', 'courses.id')
                                ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                                ->where('teacher_course_assignments.is_active', 1);
                        });
                    });
            });
        } elseif ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id)) {
                return $this->forbidden('Your account is not assigned to an active branch.');
            }
            $query->where('courses.branch_id', $actor->branch_id);
        }

        $examId = $request->integer('exam_id');
        if ($examId > 0) {
            $query->where('attempts.exam_id', $examId);
        }

        $items = $query->orderByDesc('attempts.started_at')->limit(200)->get();

        return response()->json(['success' => true, 'message' => 'Exam attempts loaded.', 'data' => ['items' => $items]]);
    }

    public function start(Request $request, int $exam): JsonResponse
    {
        $actor = $request->user();
        $result = DB::transaction(function () use ($actor, $exam): array|JsonResponse {
            $row = DB::table('exams')->where('id', $exam)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row || !$this->examAccessible($actor, $row)) {
                return response()->json(['success' => false, 'message' => 'Exam not found or not available to this account.', 'error' => 'Not found.'], 404);
            }

            if (DB::table('exam_questions')->where('exam_id', $exam)->count() < 1) {
                return response()->json(['success' => false, 'message' => 'This exam does not have any questions yet.', 'error' => 'Conflict.'], 409);
            }

            DB::table('exam_attempts')
                ->where('exam_id', $exam)
                ->where('user_id', $actor->id)
                ->where('status', 'in_progress')
                ->where('expires_at', '<=', now('Asia/Dhaka')->format('Y-m-d H:i:s'))
                ->update(['status' => 'expired', 'updated_at' => now()]);

            $attempt = DB::table('exam_attempts')
                ->where('exam_id', $exam)
                ->where('user_id', $actor->id)
                ->where('status', 'in_progress')
                ->where('expires_at', '>', now('Asia/Dhaka')->format('Y-m-d H:i:s'))
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if (!$attempt) {
                $count = DB::table('exam_attempts')->where('exam_id', $exam)->where('user_id', $actor->id)->count();
                if ($count >= (int) $row->max_attempts) {
                    return response()->json(['success' => false, 'message' => 'You have used all attempts allowed for this exam.', 'error' => 'Conflict.'], 409);
                }

                $startedAt = now('Asia/Dhaka');
                $expiresAt = $startedAt->copy()->addMinutes((int) $row->duration_minutes);
                $attemptId = (int) DB::table('exam_attempts')->insertGetId([
                    'exam_id' => $exam,
                    'user_id' => (int) $actor->id,
                    'started_at' => $startedAt,
                    'expires_at' => $expiresAt,
                    'status' => 'in_progress',
                    'created_at' => $startedAt,
                    'updated_at' => $startedAt,
                ]);
                $attempt = DB::table('exam_attempts')->where('id', $attemptId)->first();
            }

            $answers = $attempt->answers_json ? (json_decode((string) $attempt->answers_json, true) ?: []) : [];
            $remaining = max(0, Carbon::parse($attempt->expires_at, 'Asia/Dhaka')->getTimestamp() - now('Asia/Dhaka')->getTimestamp());

            return [
                'attempt' => [
                    'id' => (int) $attempt->id,
                    'started_at' => $attempt->started_at,
                    'expires_at' => $attempt->expires_at,
                    'remaining_seconds' => $remaining,
                    'answers' => $answers,
                ],
            ];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam attempt ready.', 'data' => $result]);
    }

    public function saveAnswers(Request $request, int $attempt): JsonResponse
    {
        $actor = $request->user();
        $answers = $request->input('answers');
        if (!is_array($answers)) {
            return response()->json(['success' => false, 'message' => 'Answers must be an object keyed by question identifier.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($actor, $attempt, $answers): array|JsonResponse {
            $row = DB::table('exam_attempts')->where('id', $attempt)->where('user_id', $actor->id)->lockForUpdate()->first();
            if (!$row) {
                return response()->json(['success' => false, 'message' => 'Exam attempt not found.', 'error' => 'Not found.'], 404);
            }
            if ($row->status !== 'in_progress') {
                return response()->json(['success' => false, 'message' => 'This exam attempt is no longer editable.', 'error' => 'Conflict.'], 409);
            }
            if (Carbon::parse($row->expires_at, 'Asia/Dhaka')->lte(now('Asia/Dhaka'))) {
                DB::table('exam_attempts')->where('id', $attempt)->update(['status' => 'expired', 'updated_at' => now()]);
                return response()->json(['success' => false, 'message' => 'Exam time has expired. The attempt was closed.', 'error' => 'Conflict.'], 409);
            }

            $questions = DB::table('exam_questions')->where('exam_id', $row->exam_id)->get(['id', 'options']);
            $allowed = [];
            foreach ($questions as $question) {
                $allowed[(string) $question->id] = count(json_decode((string) $question->options, true) ?: []);
            }

            $normalized = [];
            foreach ($answers as $questionId => $answerIndex) {
                $key = (string) $questionId;
                if (!array_key_exists($key, $allowed)) {
                    return response()->json(['success' => false, 'message' => 'Answer references a question outside this exam.', 'error' => 'Validation failed.'], 422);
                }
                $option = filter_var($answerIndex, FILTER_VALIDATE_INT);
                if ($option === false || $option < 0 || $option >= $allowed[$key]) {
                    return response()->json(['success' => false, 'message' => 'An answer contains an invalid option index.', 'error' => 'Validation failed.'], 422);
                }
                $normalized[$key] = $option;
            }

            DB::table('exam_attempts')->where('id', $attempt)->update([
                'answers_json' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

            return ['attempt_id' => $attempt, 'saved_answers' => count($normalized)];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam answers saved.', 'data' => $result]);
    }

    public function submit(Request $request, int $attempt): JsonResponse
    {
        $actor = $request->user();
        $answers = $request->input('answers');
        if (!is_array($answers)) {
            return response()->json(['success' => false, 'message' => 'Answers must be an object keyed by question identifier.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $attempt, $answers): array|JsonResponse {
            $row = DB::table('exam_attempts')->where('id', $attempt)->lockForUpdate()->first();
            if (!$row || (int) $row->user_id !== (int) $actor->id) {
                return response()->json(['success' => false, 'message' => 'Exam attempt not found.', 'error' => 'Not found.'], 404);
            }
            if ($row->status !== 'in_progress') {
                return response()->json(['success' => false, 'message' => 'This exam attempt has already been submitted or expired.', 'error' => 'Conflict.'], 409);
            }
            if (Carbon::parse($row->expires_at, 'Asia/Dhaka')->lte(now('Asia/Dhaka'))) {
                DB::table('exam_attempts')->where('id', $attempt)->update(['status' => 'expired', 'updated_at' => now()]);
                return response()->json(['success' => false, 'message' => 'Exam time has expired. The attempt was closed.', 'error' => 'Conflict.'], 409);
            }

            $exam = DB::table('exams')->where('id', $row->exam_id)->first();
            if (!$exam) {
                return response()->json(['success' => false, 'message' => 'Exam not found.', 'error' => 'Not found.'], 404);
            }
            $questions = DB::table('exam_questions')
                ->where('exam_id', $row->exam_id)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            $normalized = [];
            $review = [];
            $score = 0.0;
            foreach ($questions as $question) {
                $questionId = (string) $question->id;
                $options = json_decode((string) $question->options, true) ?: [];
                $userAnswer = null;
                if (array_key_exists($questionId, $answers)) {
                    $userAnswer = filter_var($answers[$questionId], FILTER_VALIDATE_INT);
                    if ($userAnswer === false || $userAnswer < 0 || $userAnswer >= count($options)) {
                        return response()->json(['success' => false, 'message' => 'An answer contains an invalid option index.', 'error' => 'Validation failed.'], 422);
                    }
                    $normalized[$questionId] = $userAnswer;
                    if ($userAnswer === (int) $question->correct_option_index) {
                        $score += (float) $question->marks;
                    } else {
                        $score -= (float) $exam->negative_mark_per_wrong;
                    }
                }

                $review[] = [
                    'question_id' => (int) $question->id,
                    'question' => $question->question,
                    'options' => $options,
                    'user_answer' => $userAnswer,
                    'correct_option_index' => (int) $question->correct_option_index,
                    'explanation' => $question->explanation,
                    'marks' => (float) $question->marks,
                ];
            }

            $score = max(0, round($score, 2));
            $totalMarks = (float) $exam->total_marks;
            $percentage = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0.0;
            $passed = $score >= (float) $exam->pass_marks;

            DB::table('exam_attempts')->where('id', $attempt)->update([
                'submitted_at' => now('Asia/Dhaka'),
                'score' => $score,
                'total_marks' => $totalMarks,
                'percentage' => $percentage,
                'passed' => $passed ? 1 : 0,
                'status' => 'submitted',
                'answers_json' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

            return [
                'id' => $attempt,
                'exam_id' => (int) $row->exam_id,
                'score' => $score,
                'total_marks' => $totalMarks,
                'percentage' => $percentage,
                'passed' => $passed,
                'answers' => $normalized,
                'review' => $review,
            ];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam submitted and graded.', 'data' => $result]);
    }

    public function destroy(Request $request, int $exam): JsonResponse
    {
        $actor = $request->user();
        $result = DB::transaction(function () use ($request, $actor, $exam): array|JsonResponse {
            $row = DB::table('exams')->where('id', $exam)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$row || !$this->canManageExam($actor, $row)) {
                return response()->json(['success' => false, 'message' => 'Exam not found.', 'error' => 'Not found.'], 404);
            }
            if (DB::table('exam_attempts')->where('exam_id', $exam)->exists()) {
                return response()->json(['success' => false, 'message' => 'An exam with attempts cannot be archived.', 'error' => 'Conflict.'], 409);
            }

            DB::table('exams')->where('id', $exam)->update([
                'status' => 'archived',
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);
            $branchId = $row->course_id !== null
                ? DB::table('courses')->where('id', $row->course_id)->value('branch_id')
                : null;
            DB::table('recycle_bin_items')->insert([
                'entity_type' => 'exam',
                'entity_id' => $exam,
                'title' => $row->title,
                'branch_id' => $branchId,
                'deleted_by' => (int) $actor->id,
                'snapshot' => json_encode([
                    'status' => $row->status,
                    'course_id' => $row->course_id,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'status' => 'active',
                'deleted_at' => now(),
                'expires_at' => now()->addDays(30),
                'created_at' => now(),
            ]);
            $this->audit($request, (int) $actor->id, 'exam.deleted', $exam, []);

            return ['id' => $exam];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Exam archived and moved to recycle bin.', 'data' => $result]);
    }

    private function validatePayload(Request $request, bool $creating, ?object $existing = null): array
    {
        $validated = $request->validate([
            'course_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'duration_minutes' => [$creating ? 'required' : 'sometimes', 'integer', 'min:1', 'max:1440'],
            'pass_marks' => ['sometimes', 'numeric', 'min:0', 'max:100000'],
            'negative_mark_per_wrong' => ['sometimes', 'numeric', 'min:0', 'max:1000'],
            'max_attempts' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'status' => ['sometimes', 'in:draft,published,archived'],
            'opens_at' => ['sometimes', 'nullable', 'date_format:Y-m-d H:i:s'],
            'closes_at' => ['sometimes', 'nullable', 'date_format:Y-m-d H:i:s'],
        ]);

        $payload = [
            'course_id' => array_key_exists('course_id', $validated)
                ? ($validated['course_id'] === null ? null : (int) $validated['course_id'])
                : ($existing?->course_id === null ? null : (int) $existing->course_id),
            'title' => trim((string) ($validated['title'] ?? $existing?->title ?? '')),
            'description' => trim((string) ($validated['description'] ?? $existing?->description ?? '')),
            'duration_minutes' => (int) ($validated['duration_minutes'] ?? $existing?->duration_minutes ?? 0),
            'pass_marks' => round((float) ($validated['pass_marks'] ?? $existing?->pass_marks ?? 0), 2),
            'negative_mark_per_wrong' => round((float) ($validated['negative_mark_per_wrong'] ?? $existing?->negative_mark_per_wrong ?? 0), 2),
            'max_attempts' => (int) ($validated['max_attempts'] ?? $existing?->max_attempts ?? 1),
            'status' => $validated['status'] ?? $existing?->status ?? 'draft',
            'opens_at' => array_key_exists('opens_at', $validated) ? $validated['opens_at'] : ($existing?->opens_at ?? null),
            'closes_at' => array_key_exists('closes_at', $validated) ? $validated['closes_at'] : ($existing?->closes_at ?? null),
        ];

        if ($payload['title'] === '' || $payload['duration_minutes'] < 1 || $payload['duration_minutes'] > 1440
            || $payload['max_attempts'] < 1 || $payload['max_attempts'] > 20
            || $payload['pass_marks'] < 0 || $payload['negative_mark_per_wrong'] < 0) {
            abort(422, 'Exam settings are invalid.');
        }
        if ($payload['opens_at'] !== null && $payload['closes_at'] !== null
            && Carbon::parse($payload['closes_at'], 'Asia/Dhaka')->lte(Carbon::parse($payload['opens_at'], 'Asia/Dhaka'))) {
            abort(422, 'The exam closing time must be later than its opening time.');
        }

        return $payload;
    }

    private function canManageAnyExam($actor): bool
    {
        return $actor->role === 'teacher' || LmsPermission::allows($actor, 'exams.manage');
    }

    private function canManageExam($actor, object $exam): bool
    {
        if (LmsPermission::allows($actor, 'exams.manage')) {
            if ($actor->role === 'branch_manager') {
                if (!$this->hasActiveBranch($actor->branch_id) || $exam->course_id === null) {
                    return false;
                }
                $branchId = DB::table('courses')->where('id', $exam->course_id)->value('branch_id');
                return (int) $branchId === (int) $actor->branch_id;
            }
            return true;
        }

        if ($actor->role !== 'teacher' || $exam->course_id === null) {
            return false;
        }

        return DB::table('courses')
            ->where('id', $exam->course_id)
            ->whereNull('deleted_at')
            ->where(function ($scope) use ($actor): void {
                $scope->where(function ($creator) use ($actor): void {
                    $creator->where('created_by', $actor->id);
                    if ($actor->branch_id === null) {
                        $creator->whereNull('branch_id');
                    } else {
                        $creator->where('branch_id', $actor->branch_id);
                    }
                })->orWhereExists(function ($assignment) use ($actor): void {
                    $assignment->selectRaw('1')
                        ->from('teacher_course_assignments')
                        ->whereColumn('teacher_course_assignments.course_id', 'courses.id')
                        ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                        ->where('teacher_course_assignments.is_active', 1);
                });
            })
            ->exists();
    }

    private function canManageCourse($actor, object $course): bool
    {
        if ($actor->role === 'teacher') {
            $sameBranch = $course->branch_id === null
                ? $actor->branch_id === null
                : ($actor->branch_id !== null && (int) $course->branch_id === (int) $actor->branch_id);
            return ((int) $course->created_by === (int) $actor->id && $sameBranch)
                || DB::table('teacher_course_assignments')
                    ->where('course_id', $course->id)
                    ->where('teacher_user_id', $actor->id)
                    ->where('is_active', 1)
                    ->exists();
        }

        if (!LmsPermission::allows($actor, 'courses.manage')) {
            return false;
        }

        if ($actor->role === 'branch_manager') {
            return $this->hasActiveBranch($actor->branch_id)
                && (int) $course->branch_id === (int) $actor->branch_id;
        }

        return true;
    }

    private function examAccessible($actor, object $exam): bool
    {
        if ($exam->deleted_at !== null) {
            return false;
        }
        $canManage = $this->canManageExam($actor, $exam);
        if ($exam->course_id !== null) {
            $course = DB::table('courses')->where('id', $exam->course_id)->whereNull('deleted_at')->first();
            if (!$course || ($course->status !== 'published' && !$canManage)) {
                return false;
            }
            if (!$canManage && $course->branch_id !== null && !$this->hasActiveBranch($course->branch_id)) {
                return false;
            }
        }
        if ($canManage) {
            return true;
        }
        if ($exam->status !== 'published') {
            return false;
        }
        $now = now('Asia/Dhaka');
        if (($exam->opens_at !== null && Carbon::parse($exam->opens_at, 'Asia/Dhaka')->gt($now))
            || ($exam->closes_at !== null && Carbon::parse($exam->closes_at, 'Asia/Dhaka')->lt($now))) {
            return false;
        }
        if ($exam->course_id === null) {
            return true;
        }

        $nowString = $now->format('Y-m-d H:i:s');
        $enrolled = DB::table('course_enrollments')
            ->where('user_id', $actor->id)
            ->where('course_id', $exam->course_id)
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($window) use ($nowString): void {
                $window->whereNull('ends_at')->orWhere('ends_at', '>', $nowString);
            })
            ->exists();
        if ($enrolled) {
            return true;
        }

        return DB::table('user_subscription_courses as selected')
            ->join('user_subscriptions as subscriptions', 'subscriptions.id', '=', 'selected.subscription_id')
            ->where('selected.user_id', $actor->id)
            ->where('selected.course_id', $exam->course_id)
            ->where('selected.status', 'active')
            ->where('subscriptions.status', 'active')
            ->where(function ($starts) use ($nowString): void {
                $starts->whereNull('subscriptions.starts_at')->orWhere('subscriptions.starts_at', '<=', $nowString);
            })
            ->where(function ($ends) use ($nowString): void {
                $ends->whereNull('subscriptions.ends_at')->orWhere('subscriptions.ends_at', '>', $nowString);
            })
            ->exists();
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }

    private function audit(Request $request, int $actorId, string $event, int $examId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'exam',
            'entity_id' => $examId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }
}
