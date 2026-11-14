<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CourseProgressController extends Controller
{
    public function show(Request $request, int $course): JsonResponse
    {
        $actor = $request->user();
        if (!$this->canTrackCourseProgress($actor, $course)) {
            return response()->json([
                'success' => false,
                'message' => 'Active course enrollment is required to view progress.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $items = DB::table('course_lesson_progress')
            ->where('user_id', $actor->id)
            ->where('course_id', $course)
            ->select('content_item_id', 'is_completed', 'notes', 'updated_at')
            ->orderBy('content_item_id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Course progress loaded.',
            'data' => ['items' => $items],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $actor = $request->user();
        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'content_item_id' => ['required', 'integer', 'min:1'],
            'is_completed' => ['required', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        $courseId = (int) $validated['course_id'];
        $contentId = (int) $validated['content_item_id'];

        if (!$this->canTrackCourseProgress($actor, $courseId)) {
            return response()->json([
                'success' => false,
                'message' => 'Active course enrollment is required to save progress.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $linkedLesson = DB::table('course_content')
            ->join('content_items', 'content_items.id', '=', 'course_content.content_item_id')
            ->where('course_content.course_id', $courseId)
            ->where('course_content.content_item_id', $contentId)
            ->whereNull('content_items.deleted_at')
            ->where('content_items.status', 'published')
            ->exists();

        if (!$linkedLesson) {
            return response()->json([
                'success' => false,
                'message' => 'Published lesson was not found in this course.',
                'error' => 'Not found.',
            ], 404);
        }

        $now = now();
        DB::table('course_lesson_progress')->upsert(
            [[
                'user_id' => (int) $actor->id,
                'course_id' => $courseId,
                'content_item_id' => $contentId,
                'is_completed' => (bool) $validated['is_completed'] ? 1 : 0,
                'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) ?: null : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]],
            ['user_id', 'course_id', 'content_item_id'],
            ['is_completed', 'notes', 'updated_at']
        );

        return response()->json([
            'success' => true,
            'message' => 'Lesson progress saved.',
            'data' => [
                'course_id' => $courseId,
                'content_item_id' => $contentId,
                'is_completed' => (bool) $validated['is_completed'],
                'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : '',
            ],
        ]);
    }

    private function canTrackCourseProgress($actor, int $courseId): bool
    {
        $course = DB::table('courses')
            ->where('id', $courseId)
            ->whereNull('deleted_at')
            ->first(['id', 'status']);

        if (!$course) {
            return false;
        }

        if (LmsPermission::allows($actor, 'courses.manage')) {
            return true;
        }

        if ($course->status !== 'published') {
            return false;
        }

        return DB::table('course_enrollments')
            ->where('user_id', $actor->id)
            ->where('course_id', $courseId)
            ->whereIn('status', ['active', 'completed'])
            ->exists();
    }
}
