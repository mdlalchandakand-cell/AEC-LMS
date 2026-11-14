<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContentManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = DB::table('content_items as content')
            ->select([
                'content.id',
                'content.title',
                'content.content_type',
                'content.body',
                'content.media_url',
                'content.duration_minutes',
                'content.status',
                'content.created_by',
                'content.created_at',
            ])
            ->selectSub(function ($sub): void {
                $sub->from('course_content')
                    ->join('courses', 'courses.id', '=', 'course_content.course_id')
                    ->whereColumn('course_content.content_item_id', 'content.id')
                    ->whereNull('courses.deleted_at')
                    ->orderBy('course_content.sort_order')
                    ->limit(1)
                    ->select('course_content.course_id');
            }, 'course_id')
            ->whereNull('content.deleted_at');

        if ($actor->role === 'teacher') {
            $query->where(function ($owned) use ($actor): void {
                $owned->where('content.created_by', $actor->id)
                    ->orWhereExists(function ($assignment) use ($actor): void {
                        $assignment->selectRaw('1')
                            ->from('course_content')
                            ->join('teacher_course_assignments', 'teacher_course_assignments.course_id', '=', 'course_content.course_id')
                            ->whereColumn('course_content.content_item_id', 'content.id')
                            ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                            ->where('teacher_course_assignments.is_active', 1);
                    });
            });
        } elseif (!LmsPermission::allows($actor, 'content.manage')) {
            return $this->forbidden('You do not have permission to manage course content.');
        } elseif ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id)) {
                return $this->forbidden('Your account is not assigned to an active branch.');
            }
            $query->whereExists(function ($own) use ($actor): void {
                $own->selectRaw('1')
                    ->from('course_content as own_links')
                    ->join('courses as own_courses', 'own_courses.id', '=', 'own_links.course_id')
                    ->whereColumn('own_links.content_item_id', 'content.id')
                    ->where('own_courses.branch_id', $actor->branch_id)
                    ->whereNull('own_courses.deleted_at');
            })->whereNotExists(function ($foreign) use ($actor): void {
                $foreign->selectRaw('1')
                    ->from('course_content as foreign_links')
                    ->join('courses as foreign_courses', 'foreign_courses.id', '=', 'foreign_links.course_id')
                    ->whereColumn('foreign_links.content_item_id', 'content.id')
                    ->where(function ($scope) use ($actor): void {
                        $scope->whereNull('foreign_courses.branch_id')
                            ->orWhere('foreign_courses.branch_id', '<>', $actor->branch_id);
                    });
            });
        }

        $items = $query->orderByDesc('content.created_at')->orderByDesc('content.id')->limit(500)->get();

        return response()->json(['success' => true, 'message' => 'Course content loaded.', 'data' => ['items' => $items]]);
    }

    public function links(Request $request, int $content): JsonResponse
    {
        $actor = $request->user();
        $item = DB::table('content_items')->where('id', $content)->whereNull('deleted_at')->first();
        if (!$item || !$this->canManageContent($actor, $item)) {
            return response()->json(['success' => false, 'message' => 'Content not found.', 'error' => 'Not found.'], 404);
        }

        $items = DB::table('course_content as links')
            ->join('courses', 'courses.id', '=', 'links.course_id')
            ->where('links.content_item_id', $content)
            ->whereNull('courses.deleted_at')
            ->when($actor->role === 'branch_manager', fn ($query) => $query->where('courses.branch_id', $actor->branch_id))
            ->orderBy('links.sort_order')
            ->orderBy('links.id')
            ->get([
                'links.course_id',
                'courses.title as course_title',
                'links.sort_order',
                'links.is_preview',
            ]);

        return response()->json(['success' => true, 'message' => 'Content links loaded.', 'data' => ['items' => $items]]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if ($actor->role !== 'teacher' && !LmsPermission::allows($actor, 'content.manage')) {
            return $this->forbidden('You do not have permission to create content.');
        }

        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:180'],
            'content_type' => ['required', 'in:lesson,video,article,file,quiz'],
            'body' => ['sometimes', 'nullable', 'string', 'max:100000'],
            'media_url' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'duration_minutes' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'status' => ['sometimes', 'in:draft,published,archived'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_preview' => ['sometimes', 'boolean'],
        ]);

        $course = DB::table('courses')->where('id', $validated['course_id'])->whereNull('deleted_at')->first();
        if (!$course || !$this->canManageCourse($actor, $course)) {
            return response()->json(['success' => false, 'message' => 'Course not found or not assigned to you.', 'error' => 'Not found.'], 404);
        }

        $mediaUrl = trim((string) ($validated['media_url'] ?? ''));
        if ($mediaUrl !== '' && !$this->validHttpsUrl($mediaUrl)) {
            return response()->json(['success' => false, 'message' => 'Media URL must be a valid HTTPS URL.', 'error' => 'Validation failed.'], 422);
        }

        $id = DB::transaction(function () use ($actor, $validated, $mediaUrl): int {
            $id = (int) DB::table('content_items')->insertGetId([
                'title' => trim($validated['title']),
                'content_type' => $validated['content_type'],
                'body' => (string) ($validated['body'] ?? ''),
                'media_url' => $mediaUrl !== '' ? $mediaUrl : null,
                'duration_minutes' => (int) ($validated['duration_minutes'] ?? 0),
                'status' => $validated['status'] ?? 'draft',
                'created_by' => (int) $actor->id,
                'created_at' => now(),
                'updated_at' => null,
            ]);

            DB::table('course_content')->insert([
                'course_id' => (int) $validated['course_id'],
                'content_item_id' => $id,
                'sort_order' => (int) ($validated['sort_order'] ?? 0),
                'is_preview' => !empty($validated['is_preview']) ? 1 : 0,
                'created_at' => now(),
            ]);

            $this->audit($request, (int) $actor->id, 'content.created', $id, ['course_id' => (int) $validated['course_id']]);

            return $id;
        });

        return response()->json(['success' => true, 'message' => 'Content created and linked to course.', 'data' => ['id' => $id]], 201);
    }

    public function update(Request $request, int $content): JsonResponse
    {
        $actor = $request->user();
        $item = DB::table('content_items')->where('id', $content)->whereNull('deleted_at')->first();
        if (!$item || !$this->canManageContent($actor, $item)) {
            return response()->json(['success' => false, 'message' => 'Content not found.', 'error' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'content_type' => ['required', 'in:lesson,video,article,file,quiz'],
            'body' => ['sometimes', 'nullable', 'string', 'max:100000'],
            'media_url' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'duration_minutes' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'status' => ['sometimes', 'in:draft,published,archived'],
        ]);

        $mediaUrl = array_key_exists('media_url', $validated)
            ? trim((string) ($validated['media_url'] ?? ''))
            : (string) ($item->media_url ?? '');
        if ($mediaUrl !== '' && !$this->validHttpsUrl($mediaUrl)) {
            return response()->json(['success' => false, 'message' => 'Media URL must be a valid HTTPS URL.', 'error' => 'Validation failed.'], 422);
        }

        DB::table('content_items')->where('id', $content)->update([
            'title' => trim($validated['title']),
            'content_type' => $validated['content_type'],
            'body' => array_key_exists('body', $validated) ? (string) ($validated['body'] ?? '') : $item->body,
            'media_url' => $mediaUrl !== '' ? $mediaUrl : null,
            'duration_minutes' => (int) ($validated['duration_minutes'] ?? $item->duration_minutes),
            'status' => $validated['status'] ?? $item->status,
            'updated_at' => now(),
        ]);

        $this->audit($request, (int) $actor->id, 'content.updated', $content, []);

        return response()->json(['success' => true, 'message' => 'Content updated.', 'data' => ['id' => $content]]);
    }

    public function destroy(Request $request, int $content): JsonResponse
    {
        $actor = $request->user();

        $result = DB::transaction(function () use ($request, $actor, $content): array|JsonResponse {
            $item = DB::table('content_items')->where('id', $content)->whereNull('deleted_at')->lockForUpdate()->first();
            if (!$item || !$this->canManageContent($actor, $item)) {
                return response()->json(['success' => false, 'message' => 'Content not found.', 'error' => 'Not found.'], 404);
            }

            $deletedAt = now();
            DB::table('content_items')->where('id', $content)->update([
                'deleted_at' => $deletedAt,
                'updated_at' => $deletedAt,
            ]);
            DB::table('recycle_bin_items')->insert([
                'entity_type' => 'content',
                'entity_id' => $content,
                'title' => $item->title,
                'branch_id' => null,
                'deleted_by' => (int) $actor->id,
                'snapshot' => json_encode([
                    'status' => $item->status,
                    'content_type' => $item->content_type,
                    'created_by' => $item->created_by,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'status' => 'active',
                'deleted_at' => $deletedAt,
                'expires_at' => $deletedAt->copy()->addDays(30),
                'created_at' => $deletedAt,
            ]);
            $this->audit($request, $actor->id, 'content.deleted', $content, []);

            return ['id' => $content];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Content moved to recycle bin.', 'data' => $result]);
    }

    public function restore(Request $request, int $content): JsonResponse
    {
        $actor = $request->user();
        $item = DB::table('recycle_bin_items')
            ->where('entity_type', 'content')
            ->where('entity_id', $content)
            ->where('status', 'active')
            ->first();
        $contentRow = DB::table('content_items')->where('id', $content)->whereNotNull('deleted_at')->first();

        if (!$item || !$contentRow || !$this->canManageContent($actor, $contentRow)) {
            return response()->json(['success' => false, 'message' => 'Deleted content not found.', 'error' => 'Not found.'], 404);
        }

        DB::transaction(function () use ($request, $actor, $content, $item): void {
            DB::table('content_items')->where('id', $content)->update([
                'deleted_at' => null,
                'updated_at' => now(),
            ]);
            DB::table('recycle_bin_items')->where('id', $item->id)->update([
                'status' => 'restored',
                'restored_by' => (int) $actor->id,
                'restored_at' => now(),
            ]);
            $this->audit($request, $actor->id, 'content.restored', $content, []);
        });

        return response()->json(['success' => true, 'message' => 'Content restored.', 'data' => ['id' => $content]]);
    }

    public function attach(Request $request): JsonResponse
    {
        return $this->changeLink($request, false);
    }

    public function detach(Request $request): JsonResponse
    {
        return $this->changeLink($request, true);
    }

    private function changeLink(Request $request, bool $detach): JsonResponse
    {
        $actor = $request->user();
        $validated = $request->validate([
            'course_id' => ['required', 'integer', 'min:1'],
            'content_item_id' => ['required', 'integer', 'min:1'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_preview' => ['sometimes', 'boolean'],
        ]);

        $course = DB::table('courses')->where('id', $validated['course_id'])->whereNull('deleted_at')->first();
        $item = DB::table('content_items')->where('id', $validated['content_item_id'])->whereNull('deleted_at')->first();
        if (!$course || !$item || !$this->canManageCourse($actor, $course)
            || !$this->canManageContent($actor, $item)) {
            return response()->json(['success' => false, 'message' => 'Course or content not found in your permitted scope.', 'error' => 'Not found.'], 404);
        }

        if ($detach) {
            DB::table('course_content')
                ->where('course_id', $course->id)
                ->where('content_item_id', $item->id)
                ->delete();
            $this->audit($request, (int) $actor->id, 'content.unlinked', (int) $item->id, ['course_id' => (int) $course->id]);

            return response()->json(['success' => true, 'message' => 'Content unlinked from course.']);
        }

        DB::table('course_content')->upsert(
            [[
                'course_id' => (int) $course->id,
                'content_item_id' => (int) $item->id,
                'sort_order' => (int) ($validated['sort_order'] ?? 0),
                'is_preview' => !empty($validated['is_preview']) ? 1 : 0,
                'created_at' => now(),
            ]],
            ['course_id', 'content_item_id'],
            ['sort_order', 'is_preview']
        );
        $this->audit($request, (int) $actor->id, 'content.linked', (int) $item->id, ['course_id' => (int) $course->id]);

        return response()->json(['success' => true, 'message' => 'Content linked to course.']);
    }

    private function canManageContent($actor, object $item): bool
    {
        if ($actor->role === 'teacher') {
            if ((int) $item->created_by === (int) $actor->id) {
                return true;
            }

            return DB::table('course_content')
                ->join('teacher_course_assignments', 'teacher_course_assignments.course_id', '=', 'course_content.course_id')
                ->where('course_content.content_item_id', $item->id)
                ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                ->where('teacher_course_assignments.is_active', 1)
                ->exists();
        }

        if (!LmsPermission::allows($actor, 'content.manage')) {
            return false;
        }

        if ($actor->role === 'branch_manager') {
            if (!$this->hasActiveBranch($actor->branch_id)) {
                return false;
            }

            $hasOwnBranchLink = DB::table('course_content as links')
                ->join('courses', 'courses.id', '=', 'links.course_id')
                ->where('links.content_item_id', $item->id)
                ->where('courses.branch_id', $actor->branch_id)
                ->whereNull('courses.deleted_at')
                ->exists();
            $hasForeignLink = DB::table('course_content as links')
                ->join('courses', 'courses.id', '=', 'links.course_id')
                ->where('links.content_item_id', $item->id)
                ->where(function ($scope) use ($actor): void {
                    $scope->whereNull('courses.branch_id')
                        ->orWhere('courses.branch_id', '<>', $actor->branch_id);
                })
                ->exists();

            return $hasOwnBranchLink && !$hasForeignLink;
        }

        return true;
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

    private function validHttpsUrl(string $url): bool
    {
        if (strlen($url) > 1000 || !filter_var($url, FILTER_VALIDATE_URL)) {
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

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }

    private function audit(Request $request, int $actorId, string $event, int $contentId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'content',
            'entity_id' => $contentId,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }
}
