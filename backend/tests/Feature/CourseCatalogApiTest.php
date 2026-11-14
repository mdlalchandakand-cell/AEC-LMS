<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CourseCatalogApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('course_categories', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name', 120);
            $table->string('name_bn', 120)->nullable();
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->string('subtitle')->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('original_price', 12, 2)->default(0);
            $table->string('level', 40)->default('All Levels');
            $table->unsignedSmallInteger('duration_weeks')->default(0);
            $table->string('thumbnail', 500)->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('content_type', 20)->default('lesson');
            $table->text('body')->nullable();
            $table->string('media_url', 1000)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(0);
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('course_content', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('content_item_id');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['course_id', 'content_item_id']);
        });
    }

    public function test_public_catalog_only_returns_published_courses(): void
    {
        $categoryId = DB::table('course_categories')->insertGetId([
            'name' => 'Grammar',
            'name_bn' => 'ব্যাকরণ',
            'slug' => 'grammar',
        ]);

        DB::table('courses')->insert([
            ['category_id' => $categoryId, 'title' => 'Published Grammar', 'slug' => 'published-grammar', 'price' => 500, 'status' => 'published', 'created_at' => now(), 'updated_at' => now()],
            ['category_id' => $categoryId, 'title' => 'Draft Grammar', 'slug' => 'draft-grammar', 'price' => 300, 'status' => 'draft', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->getJson('/api/v1/courses');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.slug', 'published-grammar')
            ->assertJsonPath('data.items.0.category.name_bn', 'ব্যাকরণ')
            ->assertJsonMissing(['slug' => 'draft-grammar']);
    }

    public function test_course_details_only_expose_published_preview_content(): void
    {
        $courseId = DB::table('courses')->insertGetId([
            'title' => 'Preview Course',
            'slug' => 'preview-course',
            'description' => 'Public course description',
            'price' => 700,
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $previewId = DB::table('content_items')->insertGetId([
            'title' => 'Free Preview',
            'content_type' => 'video',
            'body' => 'This private body must not be returned.',
            'media_url' => 'https://example.test/preview',
            'duration_minutes' => 12,
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $lockedId = DB::table('content_items')->insertGetId([
            'title' => 'Locked Lesson',
            'content_type' => 'lesson',
            'body' => 'Paid lesson content.',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unpublishedId = DB::table('content_items')->insertGetId([
            'title' => 'Unpublished Preview',
            'content_type' => 'video',
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('course_content')->insert([
            ['course_id' => $courseId, 'content_item_id' => $previewId, 'sort_order' => 1, 'is_preview' => true, 'created_at' => now()],
            ['course_id' => $courseId, 'content_item_id' => $lockedId, 'sort_order' => 2, 'is_preview' => false, 'created_at' => now()],
            ['course_id' => $courseId, 'content_item_id' => $unpublishedId, 'sort_order' => 3, 'is_preview' => true, 'created_at' => now()],
        ]);

        $response = $this->getJson('/api/v1/courses/preview-course');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'preview-course')
            ->assertJsonPath('data.contents.0.title', 'Free Preview')
            ->assertJsonPath('data.contents.0.is_preview', true)
            ->assertJsonMissing(['title' => 'Locked Lesson'])
            ->assertJsonMissing(['title' => 'Unpublished Preview'])
            ->assertJsonMissing(['body' => 'This private body must not be returned.']);
    }

    public function test_draft_and_deleted_courses_are_not_publicly_retrievable(): void
    {
        DB::table('courses')->insert([
            ['title' => 'Draft Course', 'slug' => 'draft-course', 'status' => 'draft', 'created_at' => now(), 'updated_at' => now(), 'deleted_at' => null],
            ['title' => 'Deleted Course', 'slug' => 'deleted-course', 'status' => 'published', 'created_at' => now(), 'updated_at' => now(), 'deleted_at' => now()],
        ]);

        $this->getJson('/api/v1/courses/draft-course')->assertNotFound();
        $this->getJson('/api/v1/courses/deleted-course')->assertNotFound();
    }

    public function test_catalog_validates_pagination_and_supports_search_filters(): void
    {
        DB::table('courses')->insert([
            ['title' => 'SSC Grammar Mastery', 'subtitle' => 'Suffix and Prefix', 'slug' => 'ssc-grammar', 'status' => 'published', 'created_at' => now(), 'updated_at' => now()],
            ['title' => 'HSC Writing', 'subtitle' => 'Paragraph and Email', 'slug' => 'hsc-writing', 'status' => 'published', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->getJson('/api/v1/courses?per_page=0')->assertUnprocessable();

        $this->getJson('/api/v1/courses?q=Suffix&per_page=5')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.slug', 'ssc-grammar');
    }
}
