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

    public function contents(Request $request, int $course): JsonResponse
    {
        $actor = $request->user();
        if (!$this->canTrackCourseProgress($actor, $course)) {
            return response()->json([
                'success' => false,
                'message' => 'Active course enrollment or subscription course access is required.',
                'error' => 'Forbidden.',
            ], 403);
        }

        $items = DB::table('course_content as links')
            ->join('content_items as content', 'content.id', '=', 'links.content_item_id')
            ->leftJoin('course_lesson_progress as progress', function ($join) use ($actor, $course): void {
                $join->on('progress.content_item_id', '=', 'links.content_item_id')
                    ->where('progress.course_id', '=', $course)
                    ->where('progress.user_id', '=', $actor->id);
            })
            ->where('links.course_id', $course)
            ->whereNull('content.deleted_at')
            ->where('content.status', 'published')
            ->orderBy('links.sort_order')
            ->orderBy('content.id')
            ->get([
                'content.id',
                'content.title',
                'content.content_type',
                'content.media_url',
                'content.duration_minutes',
                'links.sort_order',
                'progress.is_completed',
            ])
            ->map(function (object $item): array {
                return [
                    'id' => (int) $item->id,
                    'title' => $item->title,
                    'content_type' => $item->content_type,
                    'media_url' => $item->media_url,
                    'duration_minutes' => (int) $item->duration_minutes,
                    'sort_order' => (int) $item->sort_order,
                    'is_completed' => (bool) $item->is_completed,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Accessible course content loaded.',
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
            ->first(['id', 'status', 'branch_id']);

        if (!$course) {
            return false;
        }
        if ($course->branch_id !== null && !DB::table('branches')
            ->where('id', $course->branch_id)
            ->where('is_active', 1)
            ->exists()) {
            return false;
        }

        if (LmsPermission::allows($actor, 'courses.manage')) {
            return true;
        }

        if ($course->status !== 'published') {
            return false;
        }

        $now = now('Asia/Dhaka')->format('Y-m-d H:i:s');
        $enrolled = DB::table('course_enrollments')
            ->where('user_id', $actor->id)
            ->where('course_id', $courseId)
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($window) use ($now): void {
                $window->whereNull('ends_at')->orWhere('ends_at', '>', $now);
            })
            ->exists();
        if ($enrolled) {
            return true;
        }

        return DB::table('user_subscription_courses as selected')
            ->join('user_subscriptions as subscriptions', 'subscriptions.id', '=', 'selected.subscription_id')
            ->where('selected.user_id', $actor->id)
            ->where('selected.course_id', $courseId)
            ->where('selected.status', 'active')
            ->where('subscriptions.status', 'active')
            ->where(function ($branch): void {
                $branch->whereNull('selected.branch_id')
                    ->orWhereExists(function ($active): void {
                        $active->selectRaw('1')
                            ->from('branches')
                            ->whereColumn('branches.id', 'selected.branch_id')
                            ->where('branches.is_active', 1);
                    });
            })
            ->where(function ($starts) use ($now): void {
                $starts->whereNull('subscriptions.starts_at')->orWhere('subscriptions.starts_at', '<=', $now);
            })
            ->where(function ($ends) use ($now): void {
                $ends->whereNull('subscriptions.ends_at')->orWhere('subscriptions.ends_at', '>', $now);
            })
            ->exists();
    }
}
