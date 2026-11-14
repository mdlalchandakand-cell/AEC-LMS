<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CourseManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = DB::table('courses as courses')
            ->leftJoin('course_categories as categories', 'categories.id', '=', 'courses.category_id')
            ->select([
                'courses.id',
                'courses.category_id',
                'courses.branch_id',
                'categories.name as category_name',
                'courses.title',
                'courses.slug',
                'courses.subtitle',
                'courses.description',
                'courses.price',
                'courses.original_price',
                'courses.level',
                'courses.duration_weeks',
                'courses.thumbnail',
                'courses.status',
                'courses.created_at',
            ])
            ->selectSub(function ($sub): void {
                $sub->from('course_content')->whereColumn('course_content.course_id', 'courses.id')->selectRaw('COUNT(*)');
            }, 'content_count')
            ->whereNull('courses.deleted_at');

        if ($actor->role === 'teacher') {
            $query->where(function ($owned) use ($actor): void {
                $owned->where('courses.created_by', $actor->id)
                    ->orWhereExists(function ($assignment) use ($actor): void {
                        $assignment->selectRaw('1')
                            ->from('teacher_course_assignments')
                            ->whereColumn('teacher_course_assignments.course_id', 'courses.id')
                            ->where('teacher_course_assignments.teacher_user_id', $actor->id)
                            ->where('teacher_course_assignments.is_active', 1);
                    });
            });
        } elseif (LmsPermission::allows($actor, 'courses.manage')) {
            if ($actor->role === 'branch_manager') {
                if (!$this->hasActiveBranch($actor->branch_id)) {
                    return $this->forbidden('Your account is not assigned to an active branch.');
                }
                $query->where('courses.branch_id', $actor->branch_id);
            }
        } else {
            return $this->forbidden('You do not have permission to manage courses.');
        }

        $items = $query->orderByDesc('courses.created_at')->orderByDesc('courses.id')->limit(500)->get();

        return response()->json(['success' => true, 'message' => 'Managed courses loaded.', 'data' => ['items' => $items]]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$this->canManageCourses($actor)) {
            return $this->forbidden('You do not have permission to create courses.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $validated = $this->validateCourse($request);
        $branchId = $this->resolveBranch($actor, $validated, null);
        if ($branchId instanceof JsonResponse) {
            return $branchId;
        }
        $categoryError = $this->validateCategory($validated['category_id'] ?? null, $branchId);
        if ($categoryError) {
            return $categoryError;
        }

        try {
            $id = (int) DB::table('courses')->insertGetId([
                'category_id' => $validated['category_id'] ?? null,
                'branch_id' => $branchId,
                'title' => trim($validated['title']),
                'slug' => strtolower(trim($validated['slug'])),
                'subtitle' => trim((string) ($validated['subtitle'] ?? '')),
                'description' => (string) ($validated['description'] ?? ''),
                'price' => $this->decimal($validated['price']),
                'original_price' => $this->decimal($validated['original_price'] ?? '0'),
                'level' => trim((string) ($validated['level'] ?? 'All Levels')),
                'duration_weeks' => (int) ($validated['duration_weeks'] ?? 0),
                'thumbnail' => trim((string) ($validated['thumbnail'] ?? '')),
                'status' => $validated['status'] ?? 'draft',
                'created_by' => (int) $actor->id,
                'created_at' => now(),
                'updated_at' => null,
            ]);
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json(['success' => false, 'message' => 'That course slug is already in use.', 'error' => 'Conflict.'], 409);
            }
            throw $exception;
        }

        $this->audit($request, $actor->id, 'course.created', $id, ['branch_id' => $branchId]);

        return response()->json(['success' => true, 'message' => 'Course created.', 'data' => ['id' => $id]], 201);
    }

    public function update(Request $request, int $course): JsonResponse
    {
        $actor = $request->user();
        $existing = DB::table('courses')->where('id', $course)->whereNull('deleted_at')->first();
        if (!$existing || !$this->canManageCourse($actor, $existing)) {
            return response()->json(['success' => false, 'message' => 'Course not found.', 'error' => 'Not found.'], 404);
        }

        $validated = $this->validateCourse($request);
        $branchId = $this->resolveBranch($actor, $validated, $existing);
        if ($branchId instanceof JsonResponse) {
            return $branchId;
        }
        $categoryError = $this->validateCategory($validated['category_id'] ?? null, $branchId);
        if ($categoryError) {
            return $categoryError;
        }

        try {
            DB::table('courses')->where('id', $course)->update([
                'category_id' => $validated['category_id'] ?? null,
                'branch_id' => $branchId,
                'title' => trim($validated['title']),
                'slug' => strtolower(trim($validated['slug'])),
                'subtitle' => trim((string) ($validated['subtitle'] ?? '')),
                'description' => (string) ($validated['description'] ?? ''),
                'price' => $this->decimal($validated['price']),
                'original_price' => $this->decimal($validated['original_price'] ?? '0'),
                'level' => trim((string) ($validated['level'] ?? 'All Levels')),
                'duration_weeks' => (int) ($validated['duration_weeks'] ?? 0),
                'thumbnail' => trim((string) ($validated['thumbnail'] ?? '')),
                'status' => $validated['status'] ?? 'draft',
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json(['success' => false, 'message' => 'That course slug is already in use.', 'error' => 'Conflict.'], 409);
            }
            throw $exception;
        }

        $this->audit($request, $actor->id, 'course.updated', $course, ['branch_id' => $branchId]);

        return response()->json(['success' => true, 'message' => 'Course updated.', 'data' => ['id' => $course]]);
    }

    public function destroy(Request $request, int $course): JsonResponse
    {
        $actor = $request->user();
        $existing = DB::table('courses')->where('id', $course)->whereNull('deleted_at')->lockForUpdate()->first();
        if (!$existing || !$this->canManageCourse($actor, $existing)) {
            return response()->json(['success' => false, 'message' => 'Course not found.', 'error' => 'Not found.'], 404);
        }

        DB::transaction(function () use ($request, $actor, $existing, $course): void {
            $deletedAt = now();
            DB::table('courses')->where('id', $course)->update([
                'deleted_at' => $deletedAt,
                'updated_at' => $deletedAt,
            ]);

            DB::table('teacher_course_assignments')
                ->where('course_id', $course)
                ->where('is_active', 1)
                ->update([
                    'is_active' => 0,
                    'unassigned_at' => $deletedAt,
                    'updated_at' => $deletedAt,
                ]);

            DB::table('recycle_bin_items')->insert([
                'entity_type' => 'course',
                'entity_id' => $course,
                'title' => $existing->title,
                'branch_id' => $existing->branch_id,
                'deleted_by' => (int) $actor->id,
                'snapshot' => json_encode([
                    'status' => $existing->status,
                    'slug' => $existing->slug,
                    'category_id' => $existing->category_id,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'status' => 'active',
                'deleted_at' => $deletedAt,
                'expires_at' => $deletedAt->copy()->addDays(30),
                'created_at' => $deletedAt,
            ]);

            $this->audit($request, $actor->id, 'course.deleted', $course, []);
        });

        return response()->json(['success' => true, 'message' => 'Course moved to recycle bin.', 'data' => ['id' => $course]]);
    }

    public function restore(Request $request, int $course): JsonResponse
    {
        $actor = $request->user();
        $item = DB::table('recycle_bin_items')
            ->where('entity_type', 'course')
            ->where('entity_id', $course)
            ->where('status', 'active')
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Deleted course not found.', 'error' => 'Not found.'], 404);
        }

        $courseRow = DB::table('courses')->where('id', $course)->whereNotNull('deleted_at')->first();
        if (!$courseRow || !$this->canManageCourse($actor, $courseRow, true)) {
            return response()->json(['success' => false, 'message' => 'Deleted course not found.', 'error' => 'Not found.'], 404);
        }

        if ($item->branch_id !== null && !$this->hasActiveBranch($item->branch_id)) {
            return $this->forbidden('The course branch is inactive.');
        }

        DB::transaction(function () use ($request, $actor, $course, $item): void {
            DB::table('courses')->where('id', $course)->update([
                'deleted_at' => null,
                'updated_at' => now(),
            ]);
            DB::table('recycle_bin_items')->where('id', $item->id)->update([
                'status' => 'restored',
                'restored_by' => (int) $actor->id,
                'restored_at' => now(),
            ]);
            $this->audit($request, $actor->id, 'course.restored', $course, []);
        });

        return response()->json(['success' => true, 'message' => 'Course restored.', 'data' => ['id' => $course]]);
    }

    private function validateCourse(Request $request): array
    {
        $validated = $request->validate([
            'category_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'title' => ['required', 'string', 'max:180'],
            'slug' => ['required', 'string', 'max:200', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/i'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'price' => ['required'],
            'original_price' => ['sometimes', 'nullable'],
            'level' => ['sometimes', 'nullable', 'string', 'max:80'],
            'duration_weeks' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'thumbnail' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'status' => ['sometimes', 'in:draft,published,archived'],
            'branch_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        foreach (['price', 'original_price'] as $field) {
            if (!array_key_exists($field, $validated) || $validated[$field] === null) {
                continue;
            }
            if (!is_string($validated[$field]) && !is_int($validated[$field]) && !is_float($validated[$field])) {
                abort(422, 'Course price must be a valid amount.');
            }
            $value = trim((string) $validated[$field]);
            if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $value)) {
                abort(422, 'Course price must be a non-negative amount with up to two decimal places.');
            }
            $validated[$field] = $value;
        }

        if (!isset($validated['price'])) {
            abort(422, 'Course price is required.');
        }

        return $validated;
    }

    private function resolveBranch($actor, array $validated, ?object $existing): int|null|JsonResponse
    {
        if ($actor->role === 'teacher') {
            $branchId = $existing ? ($existing->branch_id === null ? null : (int) $existing->branch_id)
                : ($actor->branch_id === null ? null : (int) $actor->branch_id);
        } elseif ($actor->role === 'branch_manager') {
            $branchId = (int) $actor->branch_id;
        } else {
            $branchId = array_key_exists('branch_id', $validated)
                ? ($validated['branch_id'] === null ? null : (int) $validated['branch_id'])
                : ($existing ? ($existing->branch_id === null ? null : (int) $existing->branch_id) : null);
        }

        if ($branchId !== null && !$this->hasActiveBranch($branchId)) {
            return response()->json(['success' => false, 'message' => 'An active branch is required.', 'error' => 'Validation failed.'], 422);
        }

        if ($actor->role === 'branch_manager' && $branchId !== (int) $actor->branch_id) {
            return $this->forbidden('Course is outside your assigned branch.');
        }

        return $branchId;
    }

    private function validateCategory(mixed $categoryId, ?int $branchId): ?JsonResponse
    {
        if ($categoryId === null) {
            return null;
        }

        $category = DB::table('course_categories')->where('id', $categoryId)->first(['id', 'branch_id']);
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Course category not found.', 'error' => 'Not found.'], 404);
        }

        if ($category->branch_id !== null && (int) $category->branch_id !== (int) ($branchId ?? 0)) {
            return response()->json(['success' => false, 'message' => 'Course and category must belong to the same branch.', 'error' => 'Validation failed.'], 422);
        }

        return null;
    }

    private function canManageCourses($actor): bool
    {
        return $actor->role === 'teacher' || LmsPermission::allows($actor, 'courses.manage');
    }

    private function canManageCourse($actor, object $course, bool $restoring = false): bool
    {
        if ($actor->role === 'teacher') {
            if ((int) $course->created_by === (int) $actor->id) {
                return true;
            }

            return DB::table('teacher_course_assignments')
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

    private function decimal(mixed $value): string
    {
        $raw = trim((string) ($value ?? '0'));
        if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $raw)) {
            return '0.00';
        }
        [$whole, $fraction] = array_pad(explode('.', $raw, 2), 2, '0');
        return $whole . '.' . str_pad($fraction, 2, '0');
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function audit(Request $request, int $actorId, string $event, int $courseId, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'course',
            'entity_id' => $courseId,
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
