<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CertificateController extends Controller
{
    public function verify(Request $request, string $number): JsonResponse
    {
        $number = strtoupper(trim($number));
        if (strlen($number) > 60 || !preg_match('/^AEC-CERT-\d{4}-[A-F0-9]{32}$/', $number)) {
            return response()->json(['success' => false, 'message' => 'Enter a valid certificate number.', 'error' => 'Validation failed.'], 422);
        }

        $row = DB::table('certificates')
            ->where('certificate_number', $number)
            ->first([
                'certificate_number',
                'student_name_snapshot',
                'course_title_snapshot',
                'completion_date',
                'grade',
                'authorized_by',
                'status',
                'issued_at',
                'revoked_at',
            ]);

        if (!$row) {
            return response()->json(['success' => false, 'message' => 'No certificate record was found.', 'error' => 'Not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Certificate record found.',
            'data' => [
                'certificate_number' => $row->certificate_number,
                'student_name' => $row->student_name_snapshot,
                'course_title' => $row->course_title_snapshot,
                'completion_date' => $row->completion_date,
                'grade' => $row->grade,
                'authorized_by' => $row->authorized_by,
                'issue_date' => $row->issued_at,
                'status' => $row->status,
                'valid' => $row->status === 'issued',
                'revoked_at' => $row->revoked_at,
            ],
        ]);
    }

    public function my(Request $request): JsonResponse
    {
        $student = $request->user();
        if ($student->role !== 'student') {
            return $this->forbidden('Student account required.');
        }

        $items = DB::table('certificates')
            ->where('student_user_id', $student->id)
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get([
                'id',
                'certificate_number',
                'student_id_snapshot',
                'student_name_snapshot',
                'course_id',
                'course_title_snapshot',
                'completion_date',
                'grade',
                'authorized_by',
                'status',
                'issued_at',
                'revoked_at',
                'revoke_reason',
            ]);

        return response()->json(['success' => true, 'message' => 'Your certificates loaded.', 'data' => ['items' => $items]]);
    }

    public function students(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'certificates.manage')) {
            return $this->forbidden('You do not have permission to issue certificates.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $query = DB::table('users')
            ->where('role', 'student')
            ->where('is_active', 1);
        if ($actor->role === 'branch_manager') {
            $query->where('branch_id', $actor->branch_id);
        }

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where(function ($filter) use ($search): void {
                $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
                $filter->where('name', 'like', $term)->orWhere('email', 'like', $term);
            });
        }

        $items = $query->orderBy('name')->orderBy('id')->limit(100)->get(['id', 'name', 'email', 'branch_id']);

        return response()->json(['success' => true, 'message' => 'Eligible students loaded.', 'data' => ['items' => $items]]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'certificates.manage')) {
            return $this->forbidden('You do not have permission to manage certificates.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $query = DB::table('certificates');
        if ($actor->role === 'branch_manager') {
            $query->where('branch_id', $actor->branch_id);
        }

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where(function ($filter) use ($search): void {
                $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
                $filter->where('certificate_number', 'like', $term)
                    ->orWhere('student_name_snapshot', 'like', $term)
                    ->orWhere('course_title_snapshot', 'like', $term);
            });
        }

        $items = $query->orderByDesc('issued_at')->orderByDesc('id')->limit(500)->get([
            'id',
            'certificate_number',
            'student_user_id',
            'course_id',
            'branch_id',
            'student_id_snapshot',
            'student_name_snapshot',
            'course_title_snapshot',
            'completion_date',
            'grade',
            'authorized_by',
            'status',
            'issued_at',
            'revoked_at',
            'revoke_reason',
        ]);

        return response()->json(['success' => true, 'message' => 'Certificates loaded.', 'data' => ['items' => $items]]);
    }

    public function issue(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'certificates.manage')) {
            return $this->forbidden('You do not have permission to issue certificates.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $validated = $request->validate([
            'student_user_id' => ['required', 'integer', 'min:1'],
            'course_id' => ['required', 'integer', 'min:1'],
            'grade' => ['sometimes', 'string', 'min:1', 'max:100'],
        ]);
        $grade = trim((string) ($validated['grade'] ?? 'Completed'));
        if ($grade === '') {
            return response()->json(['success' => false, 'message' => 'Grade is required.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $validated, $grade): array|JsonResponse {
            $student = DB::table('users')
                ->where('id', $validated['student_user_id'])
                ->where('role', 'student')
                ->where('is_active', 1)
                ->lockForUpdate()
                ->first(['id', 'name', 'branch_id']);
            if (!$student) {
                return response()->json(['success' => false, 'message' => 'An active student account is required.', 'error' => 'Not found.'], 404);
            }

            $course = DB::table('courses')
                ->where('id', $validated['course_id'])
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->first(['id', 'title', 'status', 'branch_id']);
            if (!$course) {
                return response()->json(['success' => false, 'message' => 'Course not found.', 'error' => 'Not found.'], 404);
            }

            $enrollment = DB::table('course_enrollments')
                ->where('user_id', $student->id)
                ->where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed'])
                ->lockForUpdate()
                ->first(['id', 'status', 'completed_at', 'branch_id']);
            if (!$enrollment) {
                return response()->json(['success' => false, 'message' => 'Student must be enrolled in this course before a certificate can be issued.', 'error' => 'Conflict.'], 409);
            }

            if ($actor->role === 'branch_manager'
                && ((int) $student->branch_id !== (int) $actor->branch_id
                    || (int) $course->branch_id !== (int) $actor->branch_id
                    || (int) $enrollment->branch_id !== (int) $actor->branch_id)) {
                return response()->json(['success' => false, 'message' => 'Student, course and enrollment must belong to your assigned branch.', 'error' => 'Forbidden.'], 403);
            }

            $progress = DB::table('course_content as links')
                ->join('content_items as content', 'content.id', '=', 'links.content_item_id')
                ->leftJoin('course_lesson_progress as progress', function ($join) use ($student): void {
                    $join->on('progress.course_id', '=', 'links.course_id')
                        ->on('progress.content_item_id', '=', 'links.content_item_id')
                        ->where('progress.user_id', '=', $student->id);
                })
                ->where('links.course_id', $course->id)
                ->whereNull('content.deleted_at')
                ->where('content.status', 'published')
                ->selectRaw('COUNT(*) AS total_items')
                ->selectRaw('SUM(CASE WHEN progress.is_completed = 1 THEN 1 ELSE 0 END) AS completed_items')
                ->selectRaw('MAX(progress.updated_at) AS last_completed_at')
                ->first();

            $totalItems = (int) ($progress->total_items ?? 0);
            $completedItems = (int) ($progress->completed_items ?? 0);
            $isComplete = $enrollment->status === 'completed'
                || ($totalItems > 0 && $completedItems === $totalItems);
            if (!$isComplete) {
                return response()->json([
                    'success' => false,
                    'message' => 'Course completion is required before issuing a certificate.',
                    'error' => 'Conflict.',
                ], 409);
            }

            $existing = DB::table('certificates')
                ->where('student_user_id', $student->id)
                ->where('course_id', $course->id)
                ->first(['id']);
            if ($existing) {
                return response()->json(['success' => false, 'message' => 'A certificate already exists for this student and course.', 'error' => 'Conflict.'], 409);
            }

            $year = now('Asia/Dhaka')->format('Y');
            $certificateNumber = 'AEC-CERT-' . $year . '-' . strtoupper(bin2hex(random_bytes(16)));
            $studentCode = 'AEC-' . $year . '-' . str_pad((string) $student->id, 6, '0', STR_PAD_LEFT);
            $completionDate = $enrollment->completed_at
                ? substr((string) $enrollment->completed_at, 0, 10)
                : ($progress->last_completed_at ? substr((string) $progress->last_completed_at, 0, 10) : now('Asia/Dhaka')->format('Y-m-d'));
            $branchId = $enrollment->branch_id !== null
                ? (int) $enrollment->branch_id
                : ($course->branch_id !== null ? (int) $course->branch_id : null);

            $id = (int) DB::table('certificates')->insertGetId([
                'certificate_number' => $certificateNumber,
                'student_user_id' => (int) $student->id,
                'course_id' => (int) $course->id,
                'branch_id' => $branchId,
                'student_id_snapshot' => $studentCode,
                'student_name_snapshot' => $student->name,
                'course_title_snapshot' => $course->title,
                'completion_date' => $completionDate,
                'grade' => $grade,
                'authorized_by' => $actor->name,
                'status' => 'issued',
                'issued_by' => (int) $actor->id,
                'issued_at' => now('Asia/Dhaka'),
                'created_at' => now(),
            ]);

            $this->audit($request, (int) $actor->id, 'certificate.issued', $id, [
                'certificate_number' => $certificateNumber,
                'student_user_id' => (int) $student->id,
                'course_id' => (int) $course->id,
            ]);
            $this->notify((int) $student->id, (int) $actor->id, 'Certificate issued', 'Your certificate for ' . $course->title . ' is ready. Certificate number: ' . $certificateNumber . '.', 'success');

            return ['id' => $id, 'certificate_number' => $certificateNumber];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Certificate issued.', 'data' => $result], 201);
    }

    public function revoke(Request $request, int $certificate): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'certificates.manage')) {
            return $this->forbidden('You do not have permission to revoke certificates.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:1', 'max:500'],
        ]);
        $reason = trim($validated['reason']);
        if ($reason === '') {
            return response()->json(['success' => false, 'message' => 'A revocation reason is required.', 'error' => 'Validation failed.'], 422);
        }

        $result = DB::transaction(function () use ($request, $actor, $certificate, $reason): array|JsonResponse {
            $row = DB::table('certificates')->where('id', $certificate)->lockForUpdate()->first();
            if (!$row || ($actor->role === 'branch_manager' && (int) $row->branch_id !== (int) $actor->branch_id)) {
                return response()->json(['success' => false, 'message' => 'Certificate not found.', 'error' => 'Not found.'], 404);
            }
            if ($row->status === 'revoked') {
                return response()->json(['success' => false, 'message' => 'Certificate has already been revoked.', 'error' => 'Conflict.'], 409);
            }

            DB::table('certificates')->where('id', $certificate)->update([
                'status' => 'revoked',
                'revoked_by' => (int) $actor->id,
                'revoked_at' => now('Asia/Dhaka'),
                'revoke_reason' => $reason,
            ]);
            $this->audit($request, (int) $actor->id, 'certificate.revoked', $certificate, [
                'certificate_number' => $row->certificate_number,
                'reason' => $reason,
            ]);
            $this->notify((int) $row->student_user_id, (int) $actor->id, 'Certificate revoked', 'Your certificate for ' . $row->course_title_snapshot . ' has been revoked. Reason: ' . $reason, 'warning');

            return ['id' => $certificate, 'status' => 'revoked'];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Certificate revoked.', 'data' => $result]);
    }

    private function audit(Request $request, int $actorId, string $event, int $certificateId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'certificate',
            'entity_id' => $certificateId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function notify(int $recipientId, int $senderId, string $title, string $message, string $type): void
    {
        DB::table('notifications')->insert([
            'recipient_user_id' => $recipientId,
            'sender_user_id' => $senderId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'target_role' => 'student',
            'action_url' => 'certificates',
            'created_at' => now(),
        ]);
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
}
