<?php

namespace Tests\Feature;

use App\Models\ContentItem;
use App\Models\Course;
use App\Models\CourseCategory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Tests\TestCase;

class CourseCatalogModelTest extends TestCase
{
    public function test_course_model_maps_existing_course_schema_and_soft_deletes(): void
    {
        $course = new Course();

        $this->assertSame('courses', $course->getTable());
        $this->assertContains(SoftDeletes::class, class_uses_recursive(Course::class));
        $this->assertSame('category_id', $course->category()->getForeignKeyName());
        $this->assertInstanceOf(BelongsTo::class, $course->category());
        $this->assertInstanceOf(BelongsTo::class, $course->creator());
        $this->assertInstanceOf(BelongsToMany::class, $course->contents());
        $this->assertSame('course_content', $course->contents()->getTable());
        $this->assertSame('course_id', $course->contents()->getForeignPivotKeyName());
        $this->assertSame('content_item_id', $course->contents()->getRelatedPivotKeyName());
    }

    public function test_course_catalog_models_cast_existing_numeric_fields(): void
    {
        $course = new Course();
        $course->setRawAttributes(['price' => '1250.5', 'original_price' => '1500.00', 'duration_weeks' => '8']);

        $this->assertSame('1250.50', $course->price);
        $this->assertSame('1500.00', $course->original_price);
        $this->assertSame(8, $course->duration_weeks);

        $content = new ContentItem();
        $content->setRawAttributes(['duration_minutes' => '45']);
        $this->assertSame(45, $content->duration_minutes);

        $category = new CourseCategory();
        $category->setRawAttributes(['parent_id' => '4', 'sort_order' => '10']);
        $this->assertSame(4, $category->parent_id);
        $this->assertSame(10, $category->sort_order);
    }

    public function test_content_items_and_categories_map_existing_relationships(): void
    {
        $content = new ContentItem();
        $this->assertSame('content_items', $content->getTable());
        $this->assertContains(SoftDeletes::class, class_uses_recursive(ContentItem::class));
        $this->assertInstanceOf(BelongsTo::class, $content->creator());
        $this->assertInstanceOf(BelongsToMany::class, $content->courses());
        $this->assertSame('content_item_id', $content->courses()->getForeignPivotKeyName());
        $this->assertSame('course_id', $content->courses()->getRelatedPivotKeyName());

        $category = new CourseCategory();
        $this->assertSame('course_categories', $category->getTable());
        $this->assertFalse($category->usesTimestamps());
        $this->assertInstanceOf(BelongsTo::class, $category->parent());
        $this->assertInstanceOf(HasMany::class, $category->children());
        $this->assertInstanceOf(HasMany::class, $category->courses());
    }

    public function test_privilege_and_creator_fields_are_not_mass_assignable(): void
    {
        $course = new Course([
            'title' => 'Untrusted Course',
            'slug' => 'untrusted-course',
            'created_by' => 999,
            'status' => 'published',
        ]);

        $this->assertSame('Untrusted Course', $course->title);
        $this->assertNull($course->created_by);
        $this->assertNull($course->status);
        $this->assertNotContains('created_by', $course->getFillable());
        $this->assertNotContains('status', $course->getFillable());

        $content = new ContentItem([
            'title' => 'Untrusted Lesson',
            'created_by' => 999,
            'status' => 'published',
        ]);
        $this->assertNull($content->created_by);
        $this->assertNull($content->status);
        $this->assertNotContains('status', $content->getFillable());
    }
}
