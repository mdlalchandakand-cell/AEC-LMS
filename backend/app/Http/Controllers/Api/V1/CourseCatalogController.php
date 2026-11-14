<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\ContentItem;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseCatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Course::query()
            ->published()
            ->with('category:id,name,name_bn,slug');

        if (isset($validated['category_id'])) {
            $query->where('category_id', (int) $validated['category_id']);
        }

        if (isset($validated['q']) && trim($validated['q']) !== '') {
            $term = trim($validated['q']);
            $query->where(function ($builder) use ($term): void {
                $builder->where('title', 'like', '%' . $term . '%')
                    ->orWhere('subtitle', 'like', '%' . $term . '%');
            });
        }

        $courses = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 12));

        $items = $courses->getCollection()->map(
            fn (Course $course): array => $this->summary($course)
        )->values();

        return response()->json([
            'success' => true,
            'message' => 'Published courses loaded.',
            'data' => [
                'items' => $items,
                'pagination' => [
                    'current_page' => $courses->currentPage(),
                    'last_page' => $courses->lastPage(),
                    'per_page' => $courses->perPage(),
                    'total' => $courses->total(),
                ],
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $course = Course::query()
            ->published()
            ->where('slug', $slug)
            ->with([
                'category:id,name,name_bn,slug',
                'contents' => function (BelongsToMany $query): void {
                    $query->select([
                        'content_items.id',
                        'content_items.title',
                        'content_items.content_type',
                        'content_items.media_url',
                        'content_items.duration_minutes',
                    ])
                        ->where('content_items.status', 'published')
                        ->wherePivot('is_preview', true)
                        ->orderByPivot('sort_order');
                },
            ])
            ->firstOrFail();

        $contents = $course->contents->map(
            fn (ContentItem $item): array => $item->only([
                'id',
                'title',
                'content_type',
                'media_url',
                'duration_minutes',
            ]) + [
                'sort_order' => (int) $item->pivot->sort_order,
                'is_preview' => (bool) $item->pivot->is_preview,
            ]
        )->values();

        return response()->json([
            'success' => true,
            'message' => 'Course details loaded.',
            'data' => $this->summary($course) + ['contents' => $contents],
        ]);
    }

    private function summary(Course $course): array
    {
        return $course->only([
            'id',
            'title',
            'slug',
            'subtitle',
            'description',
            'price',
            'original_price',
            'level',
            'duration_weeks',
            'thumbnail',
            'status',
        ]) + [
            'category' => $course->category?->only(['id', 'name', 'name_bn', 'slug']),
        ];
    }
}
