<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LiveClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->activeBranchForbidden();
        }

        $query = DB::table('live_classes as live')
            ->join('courses', 'courses.id', '=', 'live.course_id')
            ->join('users as instructors', 'instructors.id', '=', 'live.instructor_id')
            ->select([
                'live.id',
                'live.course_id',
                'courses.title as course_title',
                'live.instructor_id',
                'instructors.name as instructor_name',
                'live.title',
                'live.starts_at',
                'live.timezone',
                'live.meeting_platform',
                'live.meeting_url',
                'live.participant_limit',
                'live.recording_url',
                'live.status',
            ]);

        if ($actor->role === 'student') {
            $now = now('Asia/Dhaka')->format('Y-m-d H:i:s');
            $query->where('live.status', '<>', 'cancelled')
                ->where(function ($access) use ($actor, $now): void {
                    $access->whereExists(function ($enrollment) use ($actor): void {
                        $enrollment->selectRaw('1')
                            ->from('course_enrollments as enrollments')
                            ->whereColumn('enrollments.course_id', 'live.course_id')
                            ->where('enrollments.user_id', $actor->id)
                            ->whereIn('enrollments.status', ['active', 'completed'])
                            ->where(function ($branch): void {
                                $branch->whereColumn('enrollments.branch_id', 'live.branch_id')
                                    ->orWhereNull('live.branch_id');
                            });
                    })->orWhereExists(function ($subscription) use ($actor, $now): void {
                        $subscription->selectRaw('1')
                            ->from('user_subscription_courses as selected')
                            ->join('user_subscriptions', 'user_subscriptions.id', '=', 'selected.subscription_id')
                            ->whereColumn('selected.course_id', 'live.course_id')
                            ->where('selected.user_id', $actor->id)
                            ->where('selected.status', 'active')
                            ->where('user_subscriptions.status', 'active')
                            ->where(function ($branch): void {
                                $branch->whereColumn('selected.branch_id', 'live.branch_id')
                                    ->orWhereNull('live.branch_id');
                            })
                            ->where(function ($active): void {
                                $active->whereNull('selected.branch_id')
                                    ->orWhereExists(function ($exists): void {
                                        $exists->selectRaw('1')
                                            ->from('branches as active_subscription_branch')
                                            ->whereColumn('active_subscription_branch.id', 'selected.branch_id')
                                            ->where('active_subscription_branch.is_active', 1);
                                    });
                            })
                            ->where(function ($starts) use ($now): void {
                                $starts->whereNull('user_subscriptions.starts_at')
                                    ->orWhere('user_subscriptions.starts_at', '<=', $now);
                            })
                            ->where(function ($ends) use ($now): void {
                                $ends->whereNull('user_subscriptions.ends_at')
                                    ->orWhere('user_subscriptions.ends_at', '>', $now);
                            });
                    });
                })
                ->where(function ($branch): void {
                    $branch->whereNull('live.branch_id')
                        ->orWhere(function ($active): void {
                            $active->whereColumn('instructors.branch_id', 'live.branch_id')
                                ->whereExists(function ($exists): void {
                                    $exists->selectRaw('1')
                                        ->from('branches as active_branch')
                                        ->whereColumn('active_branch.id', 'live.branch_id')
                                        ->where('active_branch.is_active', 1);
                                });
                        });
                });
        } elseif ($actor->role === 'teacher') {
            $query->where('live.instructor_id', $actor->id);
        } else {
            if (!LmsPermission::allows($actor, 'live_classes.manage')) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to manage live classes.',
                    'error' => 'Forbidden.',
                ], 403);
            }

            if ($actor->role === 'branch_manager') {
                $query->where('live.branch_id', $actor->branch_id)
                    ->where('instructors.branch_id', $actor->branch_id);
            }
        }

        $items = $query->orderBy('live.starts_at')->limit(500)->get();

        return response()->json([
            'success' => true,
            'message' => 'Live classes loaded.',
            'data' => ['items' => $items],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!in_array($actor->role, ['super_admin', 'admin', 'branch_manager', 'teacher'], true)
            || !LmsPermission::allows($actor, 'live_classes.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to schedule live classes.',
                'error' => 'Forbidden.',
            ], 403);
        }

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->activeBranchForbidden();
        }

        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'instructor_id' => ['sometimes', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:180'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'meeting_platform' => ['required', 'in:google_meet,zoom,teams,youtube_unlisted'],
            'participant_limit' => ['sometimes', 'integer', 'min:300', 'max:5000'],
            'meeting_url' => ['required', 'string', 'max:2048'],
        ]);

        $meetingUrl = trim($validated['meeting_url']);
        if (!$this->validMeetingUrl($meetingUrl, $validated['meeting_platform'])) {
            return response()->json([
                'success' => false,
                'message' => 'Meeting URL must be a valid HTTPS link for the selected platform.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $scheduled = DateTimeImmutable::createFromFormat(
            '!Y-m-d H:i',
            $validated['date'] . ' ' . $validated['time'],
            new DateTimeZone('Asia/Dhaka')
        );
        $dateErrors = DateTimeImmutable::getLastErrors();
        if (!$scheduled || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
            || $scheduled->format('Y-m-d H:i') !== $validated['date'] . ' ' . $validated['time']) {
            return response()->json([
                'success' => false,
                'message' => 'A valid Bangladesh-local date and time are required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $course = DB::table('courses')
            ->where('id', $validated['course_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$course) {
            return response()->json([
                'success' => false,
                'message' => 'Course not found.',
                'error' => 'Not found.',
            ], 404);
        }

        $instructorId = $actor->role === 'teacher'
            ? (int) $actor->id
            : (int) ($validated['instructor_id'] ?? $actor->id);

        $instructor = DB::table('users')
            ->where('id', $instructorId)
            ->whereIn('role', ['teacher', 'assistant_teacher'])
            ->where('is_active', 1)
            ->first();

        if (!$instructor) {
            return response()->json([
                'success' => false,
                'message' => 'An active teacher account is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        if ($course->branch_id !== null && (int) ($instructor->branch_id ?? 0) !== (int) $course->branch_id) {
            return response()->json([
                'success' => false,
                'message' => 'Instructor and course must belong to the same branch.',
                'error' => 'Validation failed.',
            ], 422);
        }

        if ($actor->role === 'branch_manager'
            && ((int) $course->branch_id !== (int) $actor->branch_id
                || (int) $instructor->branch_id !== (int) $actor->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Course and instructor must belong to your assigned branch.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $branchId = $actor->role === 'branch_manager'
            ? (int) $actor->branch_id
            : ($course->branch_id !== null ? (int) $course->branch_id : ($actor->branch_id !== null ? (int) $actor->branch_id : null));

        if ($branchId !== null && !$this->hasActiveBranch($branchId)) {
            return response()->json([
                'success' => false,
                'message' => 'An active branch is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $id = DB::transaction(function () use ($request, $actor, $course, $instructorId, $branchId, $validated, $meetingUrl, $scheduled): int {
            $id = (int) DB::table('live_classes')->insertGetId([
                'course_id' => (int) $course->id,
                'instructor_id' => $instructorId,
                'branch_id' => $branchId,
                'title' => trim($validated['title']),
                'starts_at' => $scheduled->format('Y-m-d H:i:s'),
                'timezone' => 'Asia/Dhaka',
                'meeting_platform' => $validated['meeting_platform'],
                'meeting_url' => $meetingUrl,
                'participant_limit' => (int) ($validated['participant_limit'] ?? 300),
                'status' => 'upcoming',
                'created_by' => (int) $actor->id,
                'created_at' => now(),
                'updated_at' => null,
            ]);

            $this->audit($request, $actor->id, 'live_class.created', $id, [
                'course_id' => (int) $course->id,
                'instructor_id' => $instructorId,
            ]);

            $startsLabel = $scheduled->format('Y-m-d H:i') . ' (Bangladesh time)';
            $this->notifyUser(
                $instructorId,
                (int) $actor->id,
                'New live class assigned',
                $validated['title'] . ' is scheduled for ' . $startsLabel . '.',
                'নতুন লাইভ ক্লাস নির্ধারণ করা হয়েছে',
                $validated['title'] . ' লাইভ ক্লাসের সময়: ' . $startsLabel . '।',
                'info'
            );
            $this->notifyCourseStudents(
                (int) $course->id,
                $branchId,
                (int) $actor->id,
                'New live class scheduled',
                $validated['title'] . ' for ' . $course->title . ' is scheduled for ' . $startsLabel . '.',
                'নতুন লাইভ ক্লাসের সময়সূচি',
                $course->title . ' কোর্সের ' . $validated['title'] . ' লাইভ ক্লাসের সময়: ' . $startsLabel . '।',
                'info'
            );

            return $id;
        });

        return response()->json([
            'success' => true,
            'message' => 'Live class scheduled.',
            'data' => ['id' => $id],
        ], 201);
    }

    public function update(Request $request, int $liveClass): JsonResponse
    {
        $actor = $request->user();
        $class = $this->classForActor($actor, $liveClass);
        if ($class instanceof JsonResponse) {
            return $class;
        }

        if ($class->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Cancelled live classes cannot be edited.',
                'error' => 'Conflict.',
            ], 409);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:upcoming,live,completed'],
            'recording_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
        ]);

        $status = $validated['status'] ?? $class->status;
        $allowedTransitions = [
            'upcoming' => ['live', 'completed'],
            'live' => ['completed'],
            'completed' => [],
        ];

        if ($status !== $class->status && !in_array($status, $allowedTransitions[$class->status] ?? [], true)) {
            return response()->json([
                'success' => false,
                'message' => 'The requested live class status transition is not allowed.',
                'error' => 'Conflict.',
            ], 409);
        }

        $recordingUrl = null;
        if (array_key_exists('recording_url', $validated)) {
            $recordingUrl = trim((string) $validated['recording_url']);
            if ($recordingUrl !== '' && !$this->validHttpsUrl($recordingUrl)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recording URL must use HTTPS.',
                    'error' => 'Validation failed.',
                ], 422);
            }
        }

        DB::transaction(function () use ($request, $actor, $class, $liveClass, $status, $recordingUrl): void {
            $changes = ['status' => $status, 'updated_at' => now()];
            if ($recordingUrl !== null && $recordingUrl !== '') {
                $changes['recording_url'] = $recordingUrl;
            }
            DB::table('live_classes')->where('id', $liveClass)->update($changes);

            $this->audit($request, $actor->id, 'live_class.updated', $liveClass, ['status' => $status]);

            if ($status !== $class->status && in_array($status, ['live', 'completed'], true)) {
                $label = $status === 'live' ? 'Live class started' : 'Live class completed';
                $message = $status === 'live'
                    ? $class->title . ' has started. Open the Live Classes page to join.'
                    : $class->title . ' has been marked as completed.';
                $messageBn = $status === 'live'
                    ? $class->title . ' শুরু হয়েছে। যোগ দিতে Live Classes পেজ খুলুন।'
                    : $class->title . ' সম্পন্ন হিসেবে চিহ্নিত হয়েছে.';
                $this->notifyCourseStudents(
                    (int) $class->course_id,
                    $class->branch_id !== null ? (int) $class->branch_id : null,
                    (int) $actor->id,
                    $label,
                    $message,
                    $label,
                    $messageBn,
                    'success'
                );
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Live class updated.',
            'data' => ['id' => $liveClass, 'status' => $status],
        ]);
    }

    public function cancel(Request $request, int $liveClass): JsonResponse
    {
        $actor = $request->user();
        $class = $this->classForActor($actor, $liveClass);
        if ($class instanceof JsonResponse) {
            return $class;
        }

        if ($class->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Live class is already cancelled.',
                'error' => 'Conflict.',
            ], 409);
        }

        if ($class->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'A completed live class cannot be cancelled.',
                'error' => 'Conflict.',
            ], 409);
        }

        DB::transaction(function () use ($request, $actor, $class, $liveClass): void {
            DB::table('live_classes')->where('id', $liveClass)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);
            $this->audit($request, $actor->id, 'live_class.cancelled', $liveClass, []);
            $this->notifyCourseStudents(
                (int) $class->course_id,
                $class->branch_id !== null ? (int) $class->branch_id : null,
                (int) $actor->id,
                'Live class cancelled',
                $class->title . ' has been cancelled.',
                'লাইভ ক্লাস বাতিল করা হয়েছে',
                $class->title . ' লাইভ ক্লাসটি বাতিল করা হয়েছে।',
                'warning'
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Live class cancelled.',
            'data' => ['id' => $liveClass, 'status' => 'cancelled'],
        ]);
    }

    private function classForActor($actor, int $id): mixed
    {
        if (!LmsPermission::allows($actor, 'live_classes.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage live classes.',
                'error' => 'Forbidden.',
            ], 403);
        }

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->activeBranchForbidden();
        }

        $class = DB::table('live_classes as live')
            ->join('users as instructors', 'instructors.id', '=', 'live.instructor_id')
            ->where('live.id', $id)
            ->select('live.*', 'instructors.branch_id as instructor_branch_id')
            ->first();

        if (!$class) {
            return response()->json([
                'success' => false,
                'message' => 'Live class not found.',
                'error' => 'Not found.',
            ], 404);
        }

        if ($actor->role === 'teacher' && (int) $class->instructor_id !== (int) $actor->id) {
            return response()->json([
                'success' => false,
                'message' => 'Teachers may manage only their own live classes.',
                'error' => 'Forbidden.',
            ], 403);
        }

        if ($actor->role === 'branch_manager'
            && ((int) $class->branch_id !== (int) $actor->branch_id
                || (int) ($class->instructor_branch_id ?? 0) !== (int) $actor->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Live class not found.',
                'error' => 'Not found.',
            ], 404);
        }

        if (!in_array($actor->role, ['super_admin', 'admin', 'branch_manager', 'teacher'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage live classes.',
                'error' => 'Forbidden.',
            ], 403);
        }

        return $class;
    }

    private function validMeetingUrl(string $url, string $platform): bool
    {
        if (!$this->validHttpsUrl($url)) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        return match ($platform) {
            'google_meet' => $host === 'meet.google.com',
            'zoom' => $host === 'zoom.us' || str_ends_with($host, '.zoom.us'),
            'teams' => in_array($host, ['teams.microsoft.com', 'teams.live.com'], true),
            default => false,
        };
    }

    private function validHttpsUrl(string $url): bool
    {
        if (strlen($url) > 2048 || !filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        $parts = parse_url($url);
        return is_array($parts)
            && strtolower((string) ($parts['scheme'] ?? '')) === 'https'
            && !empty($parts['host']);
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function activeBranchForbidden(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Your account is not assigned to an active branch.',
            'error' => 'Forbidden.',
        ], 403);
    }

    private function audit(Request $request, int $actorId, string $event, int $classId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'live_class',
            'entity_id' => $classId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function notifyUser(
        int $recipientId,
        int $senderId,
        string $title,
        string $message,
        string $titleBn,
        string $messageBn,
        string $type
    ): void {
        DB::table('notifications')->insert([
            'recipient_user_id' => $recipientId,
            'sender_user_id' => $senderId,
            'title' => $title,
            'title_bn' => $titleBn,
            'message' => $message,
            'message_bn' => $messageBn,
            'type' => $type,
            'target_role' => 'teacher',
            'action_url' => 'live_classes',
            'created_at' => now(),
        ]);
    }

    private function notifyCourseStudents(
        int $courseId,
        ?int $branchId,
        int $senderId,
        string $title,
        string $message,
        string $titleBn,
        string $messageBn,
        string $type
    ): void {
        $query = DB::table('course_enrollments as enrollments')
            ->join('users', 'users.id', '=', 'enrollments.user_id')
            ->where('enrollments.course_id', $courseId)
            ->whereIn('enrollments.status', ['active', 'completed'])
            ->where('users.is_active', 1);

        if ($branchId !== null) {
            $query->where('enrollments.branch_id', $branchId);
        }

        $now = now();
        $rows = $query->pluck('users.id')->unique()->map(fn ($recipientId): array => [
            'recipient_user_id' => (int) $recipientId,
            'sender_user_id' => $senderId,
            'title' => $title,
            'title_bn' => $titleBn,
            'message' => $message,
            'message_bn' => $messageBn,
            'type' => $type,
            'target_role' => 'student',
            'action_url' => 'live_classes',
            'created_at' => $now,
        ])->all();

        if ($rows !== []) {
            DB::table('notifications')->insert($rows);
        }
    }
}
