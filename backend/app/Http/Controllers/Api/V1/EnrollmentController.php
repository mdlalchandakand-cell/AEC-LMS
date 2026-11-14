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
