<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuardianController extends Controller
{
    public function myStudents(Request $request): JsonResponse
    {
        $guardian = $request->user();
        if ($guardian->role !== 'guardian') {
            return response()->json([
                'success' => false,
                'message' => 'Only guardian accounts can view linked students.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $query = DB::table('guardian_student_links as links')
            ->join('users as students', 'students.id', '=', 'links.student_user_id')
            ->where('links.guardian_user_id', $guardian->id)
            ->whereIn('links.status', ['pending', 'active'])
            ->select([
                'links.id as link_id',
                'links.relationship',
                'links.status',
                'links.requested_at',
                'links.reviewed_at',
                'students.id as student_user_id',
                'students.name as student_name',
                'students.email as student_email',
                'students.branch_id',
            ])
            ->selectRaw("CASE WHEN links.status = 'active' THEN students.phone ELSE NULL END AS student_phone");

        $query->where(function ($branch) use ($guardian): void {
            if ($guardian->branch_id === null) {
                $branch->whereNull('students.branch_id');
            } else {
                $branch->where('students.branch_id', $guardian->branch_id)
                    ->whereExists(function ($active) use ($guardian): void {
                        $active->selectRaw('1')
                            ->from('branches')
                            ->where('id', $guardian->branch_id)
                            ->where('is_active', 1);
                    });
            }
        });

        $items = $query->orderByDesc('links.requested_at')->get();

        return response()->json([
            'success' => true,
            'message' => 'Linked students loaded.',
            'data' => ['items' => $items],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $guardian = $request->user();
        if ($guardian->role !== 'guardian') {
            return response()->json([
                'success' => false,
                'message' => 'Only guardian accounts can request a student link.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'student_email' => ['required', 'string', 'email', 'max:190'],
            'relationship' => ['sometimes', 'string', 'min:1', 'max:60'],
        ]);

        $email = mb_strtolower(trim($validated['student_email']));
        $relationship = trim($validated['relationship'] ?? 'Guardian');
        if ($relationship === '') {
            return response()->json([
                'success' => false,
                'message' => 'Relationship must be between 1 and 60 characters.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $requestIp = substr((string) $request->ip(), 0, 45) ?: 'unknown';
        $attempts = DB::table('account_action_attempts')
            ->where('action', 'guardian_link')
            ->where('email', $email)
            ->where('ip_address', $requestIp)
            ->where('attempted_at', '>=', now()->subMinutes(10))
            ->count();

        if ($attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Too many guardian-link requests. Try again later.',
                'error' => 'Too many requests.',
            ], 429);
        }

        DB::table('account_action_attempts')->insert([
            'action' => 'guardian_link',
            'email' => $email,
            'ip_address' => $requestIp,
            'attempted_at' => now(),
        ]);

        $student = DB::table('users')
            ->where('email', $email)
            ->where('role', 'student')
            ->where('is_active', 1)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'An active student account with that email was not found.',
                'error' => 'Not found.',
            ], 404);
        }

        if (!$this->sameActiveBranch($guardian->branch_id, $student->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Guardian and student must belong to the same active branch.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $linkId = DB::transaction(function () use ($request, $guardian, $student, $relationship): int|JsonResponse {
            $existing = DB::table('guardian_student_links')
                ->where('guardian_user_id', $guardian->id)
                ->where('student_user_id', $student->id)
                ->lockForUpdate()
                ->first();

            if ($existing && in_array($existing->status, ['pending', 'active'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'A link request already exists for this student.',
                    'error' => 'Conflict.',
                ], 409);
            }

            if ($existing) {
                DB::table('guardian_student_links')->where('id', $existing->id)->update([
                    'relationship' => $relationship,
                    'status' => 'pending',
                    'requested_by' => (int) $guardian->id,
                    'reviewed_by' => null,
                    'requested_at' => now(),
                    'reviewed_at' => null,
                    'updated_at' => now(),
                ]);
                $id = (int) $existing->id;
            } else {
                $id = (int) DB::table('guardian_student_links')->insertGetId([
                    'guardian_user_id' => (int) $guardian->id,
                    'student_user_id' => (int) $student->id,
                    'relationship' => $relationship,
                    'status' => 'pending',
                    'requested_by' => (int) $guardian->id,
                    'requested_at' => now(),
                    'created_at' => now(),
                    'updated_at' => null,
                ]);
            }

            $this->notify(
                (int) $student->id,
                (int) $guardian->id,
                'Guardian link request',
                $guardian->name . ' requested access to your learning progress.',
                'অভিভাবক সংযোগের অনুরোধ',
                $guardian->name . ' আপনার শেখার অগ্রগতি দেখার জন্য সংযোগের অনুরোধ করেছেন।',
                'info'
            );
            $this->audit($request, (int) $guardian->id, 'guardian_link.requested', $id, [
                'student_user_id' => (int) $student->id,
            ]);

            return $id;
        });

        if ($linkId instanceof JsonResponse) {
            return $linkId;
        }

        return response()->json([
            'success' => true,
            'message' => 'Request sent. The student must accept it before any records are shared.',
            'data' => ['id' => $linkId, 'status' => 'pending'],
        ], 201);
    }

    public function incoming(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return response()->json([
                'success' => false,
                'message' => 'Only students can view incoming guardian requests.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $items = DB::table('guardian_student_links as links')
            ->join('users as guardians', 'guardians.id', '=', 'links.guardian_user_id')
            ->where('links.student_user_id', $student->id)
            ->where('links.status', 'pending')
            ->orderByDesc('links.requested_at')
            ->get([
                'links.id',
                'links.relationship',
                'links.requested_at',
                'guardians.id as guardian_user_id',
                'guardians.name as guardian_name',
                'guardians.email as guardian_email',
                'guardians.phone as guardian_phone',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Incoming guardian requests loaded.',
            'data' => ['items' => $items],
        ]);
    }

    public function respond(Request $request, int $link): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return response()->json([
                'success' => false,
                'message' => 'Only the student can approve or reject a guardian request.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:accept,reject'],
        ]);

        $result = DB::transaction(function () use ($request, $student, $link, $validated): array|JsonResponse {
            $row = DB::table('guardian_student_links as links')
                ->join('users as guardians', 'guardians.id', '=', 'links.guardian_user_id')
                ->where('links.id', $link)
                ->where('links.student_user_id', $student->id)
                ->lockForUpdate()
                ->first(['links.*', 'guardians.branch_id as guardian_branch_id']);

            if (!$row || $row->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pending guardian request not found.',
                    'error' => 'Not found.',
                ], 404);
            }

            if (!$this->sameActiveBranch($row->guardian_branch_id, $student->branch_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Guardian and student must belong to the same active branch.',
                    'error' => 'Forbidden.',
                ], 403);
            }

            $status = $validated['decision'] === 'accept' ? 'active' : 'rejected';
            DB::table('guardian_student_links')->where('id', $link)->update([
                'status' => $status,
                'reviewed_by' => (int) $student->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            $this->audit($request, (int) $student->id, 'guardian_link.' . $status, $link, [
                'guardian_user_id' => (int) $row->guardian_user_id,
            ]);
            $this->notify(
                (int) $row->guardian_user_id,
                (int) $student->id,
                'Guardian link request update',
                'Your guardian link request was ' . $status . '.',
                'অভিভাবক সংযোগের আপডেট',
                'আপনার অভিভাবক সংযোগের অনুরোধের অবস্থা: ' . $status . '।',
                $status === 'active' ? 'success' : 'warning'
            );

            return ['id' => $link, 'status' => $status];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json([
            'success' => true,
            'message' => $result['status'] === 'active' ? 'Guardian link approved.' : 'Guardian link rejected.',
            'data' => $result,
        ]);
    }

    public function revoke(Request $request, int $link): JsonResponse
    {
        $actor = $request->user();
        if (!in_array($actor->role, ['guardian', 'student'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Only linked guardians or students can revoke a link.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $column = $actor->role === 'guardian' ? 'guardian_user_id' : 'student_user_id';
        $updated = DB::table('guardian_student_links')
            ->where('id', $link)
            ->where($column, $actor->id)
            ->whereIn('status', ['pending', 'active'])
            ->update([
                'status' => 'revoked',
                'reviewed_by' => (int) $actor->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Active or pending guardian link not found.',
                'error' => 'Not found.',
            ], 404);
        }

        $this->audit($request, (int) $actor->id, 'guardian_link.revoked', $link, []);

        return response()->json([
            'success' => true,
            'message' => 'Guardian link revoked. Access is removed immediately.',
            'data' => ['id' => $link, 'status' => 'revoked'],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $guardian = $request->user();
        if ($guardian->role !== 'guardian') {
            return response()->json([
                'success' => false,
                'message' => 'Only guardian accounts can view student summaries.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'min:1'],
        ]);
        $studentId = (int) $validated['student_id'];

        $linkExists = DB::table('guardian_student_links as links')
            ->join('users as students', 'students.id', '=', 'links.student_user_id')
            ->where('links.guardian_user_id', $guardian->id)
            ->where('links.student_user_id', $studentId)
            ->where('links.status', 'active')
            ->where('students.is_active', 1)
            ->exists();

        if (!$linkExists) {
            return response()->json([
                'success' => false,
                'message' => 'Student is not linked to this guardian account.',
                'error' => 'Not found.',
            ], 404);
        }

        $student = DB::table('users')
            ->where('id', $studentId)
            ->where('role', 'student')
            ->where('is_active', 1)
            ->first(['id', 'name', 'email', 'phone', 'branch_id']);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student account is unavailable.',
                'error' => 'Not found.',
            ], 404);
        }

        if (!$this->sameActiveBranch($guardian->branch_id, $student->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Guardian and student must belong to the same active branch.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $courses = DB::table('course_enrollments as enrollments')
            ->join('courses', 'courses.id', '=', 'enrollments.course_id')
            ->where('enrollments.user_id', $studentId)
            ->orderByDesc('enrollments.enrolled_at')
            ->limit(30)
            ->get([
                'enrollments.id',
                'enrollments.course_id',
                'courses.title as course_title',
                'enrollments.status',
                'enrollments.enrolled_at',
                'enrollments.starts_at',
                'enrollments.ends_at',
            ]);

        $attendance = DB::table('attendance_records as attendance')
            ->join('courses', 'courses.id', '=', 'attendance.course_id')
            ->where('attendance.user_id', $studentId)
            ->orderByDesc('attendance.attendance_date')
            ->orderByDesc('attendance.id')
            ->limit(30)
            ->get([
                'attendance.id',
                'attendance.attendance_date',
                'attendance.status',
                'attendance.remarks',
                'courses.title as course_title',
            ]);

        $exams = DB::table('exam_attempts as attempts')
            ->join('exams', 'exams.id', '=', 'attempts.exam_id')
            ->where('attempts.user_id', $studentId)
            ->where('attempts.status', 'submitted')
            ->orderByDesc('attempts.submitted_at')
            ->orderByDesc('attempts.id')
            ->limit(30)
            ->get([
                'attempts.id',
                'exams.title as exam_title',
                'attempts.score',
                'attempts.total_marks',
                'attempts.percentage',
                'attempts.passed',
                'attempts.submitted_at',
            ]);

        $payments = DB::table('course_payments as payments')
            ->join('courses', 'courses.id', '=', 'payments.course_id')
            ->where('payments.user_id', $studentId)
            ->orderByDesc('payments.submitted_at')
            ->orderByDesc('payments.id')
            ->limit(30)
            ->get([
                'payments.id',
                'courses.title as course_title',
                'payments.amount',
                'payments.currency',
                'payments.payment_method',
                'payments.status',
                'payments.submitted_at',
                'payments.reviewed_at',
            ]);

        $certificates = DB::table('certificates')
            ->where('student_user_id', $studentId)
            ->orderByDesc('issued_at')
            ->limit(30)
            ->get(['certificate_number', 'course_title_snapshot', 'grade', 'status', 'issued_at']);

        return response()->json([
            'success' => true,
            'message' => 'Student summary loaded.',
            'data' => [
                'student' => $student,
                'courses' => $courses,
                'attendance' => $attendance,
                'exams' => $exams,
                'payments' => $payments,
                'certificates' => $certificates,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'guardians.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage guardian links.',
                'error' => 'Forbidden.',
            ], 403);
        }

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not assigned to an active branch.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,active,rejected,revoked'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:200'],
        ]);

        $query = DB::table('guardian_student_links as links')
            ->join('users as guardians', 'guardians.id', '=', 'links.guardian_user_id')
            ->join('users as students', 'students.id', '=', 'links.student_user_id')
            ->select([
                'links.id',
                'links.relationship',
                'links.status',
                'links.requested_at',
                'links.reviewed_at',
                'guardians.id as guardian_user_id',
                'guardians.name as guardian_name',
                'guardians.email as guardian_email',
                'students.id as student_user_id',
                'students.name as student_name',
                'students.email as student_email',
                'guardians.branch_id',
            ]);

        if ($actor->role === 'branch_manager') {
            $query->where('guardians.branch_id', $actor->branch_id)
                ->where('students.branch_id', $actor->branch_id);
        }

        if (isset($validated['status'])) {
            $query->where('links.status', $validated['status']);
        }

        $items = $query->orderByDesc('links.requested_at')
            ->limit((int) ($validated['per_page'] ?? 100))
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Guardian links loaded.',
            'data' => ['items' => $items],
        ]);
    }

    private function sameActiveBranch(mixed $guardianBranch, mixed $studentBranch): bool
    {
        if (($guardianBranch === null ? null : (int) $guardianBranch)
            !== ($studentBranch === null ? null : (int) $studentBranch)) {
            return false;
        }

        return $guardianBranch === null || $this->hasActiveBranch($guardianBranch);
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function audit(Request $request, int $actorId, string $event, int $linkId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'guardian_student_link',
            'entity_id' => $linkId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function notify(
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
            'target_role' => 'all',
            'action_url' => 'guardian_links',
            'created_at' => now(),
        ]);
    }
}
