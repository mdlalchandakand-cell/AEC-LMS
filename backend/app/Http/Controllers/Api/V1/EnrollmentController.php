<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CourseEnrollment;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnrollmentController extends Controller
{
    public function my(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $enrollments = CourseEnrollment::query()
            ->with('course:id,title,slug,thumbnail')
            ->where('user_id', $request->user()->id)
            ->whereHas('course')
            ->orderByDesc('enrolled_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 12));

        $items = $enrollments->getCollection()->map(function (CourseEnrollment $enrollment): array {
            return [
                'id' => $enrollment->id,
                'course_id' => $enrollment->course_id,
                'course_title' => $enrollment->course?->title,
                'course_slug' => $enrollment->course?->slug,
                'thumbnail' => $enrollment->course?->thumbnail,
                'status' => $enrollment->status,
                'enrolled_at' => $enrollment->enrolled_at,
                'starts_at' => $enrollment->starts_at,
                'ends_at' => $enrollment->ends_at,
                'completed_at' => $enrollment->completed_at,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Your enrollments loaded.',
            'data' => [
                'items' => $items,
                'pagination' => $this->pagination($enrollments),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!LmsPermission::allows($actor, 'enrollments.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage enrollments.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,active,completed,cancelled'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = CourseEnrollment::query()
            ->with([
                'student:id,name,email',
                'course:id,title,slug',
                'enrolledBy:id,name',
            ])
            ->whereHas('course');

        if ($actor->role === 'branch_manager') {
            if (!$actor->branch_id || !DB::table('branches')
                ->where('id', $actor->branch_id)
                ->where('is_active', 1)
                ->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is not assigned to an active branch.',
                    'error' => 'Forbidden.',
                ], 403);
            }

            $query->where('branch_id', $actor->branch_id);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $enrollments = $query
            ->orderByDesc('enrolled_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        $items = $enrollments->getCollection()->map(function (CourseEnrollment $enrollment): array {
            return [
                'id' => $enrollment->id,
                'user_id' => $enrollment->user_id,
                'student_name' => $enrollment->student?->name,
                'student_email' => $enrollment->student?->email,
                'course_id' => $enrollment->course_id,
                'course_title' => $enrollment->course?->title,
                'branch_id' => $enrollment->branch_id,
                'status' => $enrollment->status,
                'enrolled_at' => $enrollment->enrolled_at,
                'starts_at' => $enrollment->starts_at,
                'ends_at' => $enrollment->ends_at,
                'completed_at' => $enrollment->completed_at,
                'notes' => $enrollment->notes,
                'enrolled_by_name' => $enrollment->enrolledBy?->name,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Enrollments loaded.',
            'data' => [
                'items' => $items,
                'pagination' => $this->pagination($enrollments),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!LmsPermission::allows($actor, 'enrollments.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage enrollments.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'min:1'],
            'course_id' => ['required', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:pending,active,completed,cancelled'],
            'branch_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $student = DB::table('users')
            ->where('id', $validated['user_id'])
            ->where('role', 'student')
            ->where('is_active', 1)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'An active student account is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $course = DB::table('courses')
            ->where('id', $validated['course_id'])
            ->whereNull('deleted_at')
            ->where('status', 'published')
            ->first();

        if (!$course) {
            return response()->json([
                'success' => false,
                'message' => 'A published course is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $branchId = $validated['branch_id'] ?? null;

        if ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id)) {
                return $this->activeBranchForbidden();
            }

            if ((int) $student->branch_id !== (int) $actor->branch_id
                || (int) $course->branch_id !== (int) $actor->branch_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student and course must belong to your assigned branch.',
                    'error' => 'Forbidden.',
                ], 403);
            }

            $branchId = (int) $actor->branch_id;
        }

        $branchId ??= $course->branch_id !== null
            ? (int) $course->branch_id
            : ($student->branch_id !== null ? (int) $student->branch_id : null);

        if (($course->branch_id !== null && (int) $course->branch_id !== (int) $branchId)
            || ($student->branch_id !== null && (int) $student->branch_id !== (int) $branchId)) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment branch must match the student and course branch.',
                'error' => 'Validation failed.',
            ], 422);
        }

        if ($branchId !== null && !$this->hasActiveBranch($branchId)) {
            return response()->json([
                'success' => false,
                'message' => 'An active branch is required.',
                'error' => 'Validation failed.',
            ], 422);
        }

        try {
            $id = DB::transaction(function () use ($request, $actor, $validated, $branchId): int {
                $id = (int) DB::table('course_enrollments')->insertGetId([
                    'user_id' => (int) $validated['user_id'],
                    'course_id' => (int) $validated['course_id'],
                    'branch_id' => $branchId,
                    'status' => $validated['status'] ?? 'pending',
                    'enrolled_by' => (int) $actor->id,
                    'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) ?: null : null,
                    'enrolled_at' => now(),
                    'created_at' => now(),
                    'updated_at' => null,
                ]);

                $this->audit($request, $actor->id, 'enrollment.created', $id, [
                    'user_id' => (int) $validated['user_id'],
                    'course_id' => (int) $validated['course_id'],
                    'status' => $validated['status'] ?? 'pending',
                ]);

                return $id;
            });
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json([
                    'success' => false,
                    'message' => 'This student already has an enrollment for this course.',
                    'error' => 'Conflict.',
                ], 409);
            }

            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Enrollment created.',
            'data' => ['id' => $id],
        ], 201);
    }

    public function update(Request $request, int $enrollment): JsonResponse
    {
        $actor = $request->user();

        if (!LmsPermission::allows($actor, 'enrollments.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage enrollments.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,active,completed,cancelled'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        if ($validated === []) {
            return response()->json([
                'success' => false,
                'message' => 'No supported enrollment fields were supplied.',
                'error' => 'Validation failed.',
            ], 422);
        }

        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->activeBranchForbidden();
        }

        $current = CourseEnrollment::query()->find($enrollment);

        if (!$current || ($actor->role === 'branch_manager'
            && (int) $current->branch_id !== (int) $actor->branch_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment not found.',
                'error' => 'Not found.',
            ], 404);
        }

        $startAt = array_key_exists('starts_at', $validated) ? $validated['starts_at'] : $current->starts_at;
        $endAt = array_key_exists('ends_at', $validated) ? $validated['ends_at'] : $current->ends_at;
        if ($startAt && $endAt && strtotime((string) $endAt) < strtotime((string) $startAt)) {
            return response()->json([
                'success' => false,
                'message' => 'The enrollment end date must not be before its start date.',
                'error' => 'Validation failed.',
            ], 422);
        }

        $changes = [];
        if (array_key_exists('status', $validated)) {
            $changes['status'] = $validated['status'];
            $changes['completed_at'] = $validated['status'] === 'completed' ? now() : null;
        }
        foreach (['starts_at', 'ends_at'] as $field) {
            if (array_key_exists($field, $validated)) {
                $changes[$field] = $validated[$field];
            }
        }
        if (array_key_exists('notes', $validated)) {
            $changes['notes'] = trim((string) $validated['notes']) ?: null;
        }

        DB::transaction(function () use ($request, $actor, $current, $changes, $validated): void {
            DB::table('course_enrollments')
                ->where('id', $current->id)
                ->update($changes + ['updated_at' => now()]);

            $this->audit($request, $actor->id, 'enrollment.updated', $current->id, [
                'fields' => array_keys($validated),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Enrollment updated.',
            'data' => ['id' => $current->id],
        ]);
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

    private function audit(Request $request, int $actorId, string $event, int $enrollmentId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'course_enrollment',
            'entity_id' => $enrollmentId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function pagination($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
