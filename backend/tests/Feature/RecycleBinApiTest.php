<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RecycleBinApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160);
            $table->string('email', 190)->unique();
            $table->string('phone', 32)->nullable();
            $table->string('password_hash', 255);
            $table->string('role', 40);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('session_version')->default(1);
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('role', 40);
            $table->string('permission_key', 100);
            $table->boolean('allowed')->default(false);
            $table->unique(['role', 'permission_key']);
        });

        Schema::create('branches', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32);
            $table->string('name', 160);
            $table->boolean('is_active')->default(true);
        });
        DB::table('branches')->insert([
            ['id' => 10, 'code' => 'BR-10', 'name' => 'Branch 10', 'is_active' => 1],
            ['id' => 20, 'code' => 'BR-20', 'name' => 'Branch 20', 'is_active' => 1],
        ]);

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('content_type', 20);
            $table->text('body')->nullable();
            $table->string('media_url', 1000)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(0);
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('course_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->foreign('course_id')->references('id')->on('courses');
        });

        Schema::create('recycle_bin_items', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 40);
            $table->unsignedBigInteger('entity_id');
            $table->string('title', 255);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('snapshot')->nullable();
            $table->string('status', 20)->default('active');
            $table->dateTime('deleted_at');
            $table->dateTime('expires_at')->nullable();
            $table->unsignedBigInteger('restored_by')->nullable();
            $table->dateTime('restored_at')->nullable();
            $table->unsignedBigInteger('purged_by')->nullable();
            $table->dateTime('purged_at')->nullable();
            $table->text('purge_error')->nullable();
            $table->dateTime('created_at')->nullable();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('metadata')->nullable();
            $table->dateTime('created_at')->nullable();
        });
    }

    private function createUser(string $email, string $role, ?int $branchId = null): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => ucfirst(str_replace(['@example.test', '-', '.'], ['', ' ', ' '], $email)),
            'email' => $email,
            'phone' => '01700000000',
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => $role,
            'branch_id' => $branchId,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function login(string $email): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();
    }

    private function createCourse(int $branchId = 10, string $slug = 'deleted-course'): int
    {
        return (int) DB::table('courses')->insertGetId([
            'title' => 'Deleted Course',
            'slug' => $slug,
            'price' => '1000.00',
            'status' => 'draft',
            'branch_id' => $branchId,
            'created_by' => 1,
            'deleted_at' => now()->subDays(31),
            'updated_at' => now()->subDays(31),
        ]);
    }

    private function createRecycleItem(string $type, int $entityId, int $branchId = 10, int $daysOld = 31): int
    {
        $deletedAt = now()->subDays($daysOld);
        return (int) DB::table('recycle_bin_items')->insertGetId([
            'entity_type' => $type,
            'entity_id' => $entityId,
            'title' => 'Deleted item',
            'branch_id' => $branchId,
            'deleted_by' => 1,
            'snapshot' => json_encode(['status' => 'published']),
            'status' => 'active',
            'deleted_at' => $deletedAt,
            'expires_at' => $deletedAt->copy()->addDays(30),
            'created_at' => $deletedAt,
        ]);
    }

    public function test_recycle_bin_list_is_limited_to_branch_managers_own_branch(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 10);
        $courseOne = $this->createCourse(10, 'branch-one');
        $courseTwo = $this->createCourse(20, 'branch-two');
        $this->createRecycleItem('course', $courseOne, 10);
        $this->createRecycleItem('course', $courseTwo, 20);
        DB::table('role_permissions')->insert([
            'role' => 'branch_manager',
            'permission_key' => 'recycle_bin.manage',
            'allowed' => 1,
        ]);
        $this->login('manager@example.test');

        $this->getJson('/api/v1/recycle-bin')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.branch_id', 10);
    }

    public function test_recycle_bin_restore_requires_permission_and_restores_snapshot_status(): void
    {
        $adminId = $this->createUser('admin@example.test', 'super_admin');
        $courseId = $this->createCourse();
        $itemId = $this->createRecycleItem('course', $courseId, 10, 2);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/recycle-bin/' . $itemId . '/restore')
            ->assertOk()
            ->assertJsonPath('data.entity_id', $courseId);

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
            'deleted_at' => null,
            'status' => 'published',
        ]);
        $this->assertDatabaseHas('recycle_bin_items', [
            'id' => $itemId,
            'status' => 'restored',
            'restored_by' => $adminId,
        ]);
    }

    public function test_permanent_delete_is_blocked_before_retention_expires(): void
    {
        $this->createUser('admin@example.test', 'super_admin');
        $courseId = $this->createCourse();
        $itemId = $this->createRecycleItem('course', $courseId, 10, 2);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/recycle-bin/' . $itemId . '/permanent-delete')
            ->assertStatus(409);

        $this->assertDatabaseHas('courses', ['id' => $courseId]);
        $this->assertDatabaseHas('recycle_bin_items', ['id' => $itemId, 'status' => 'active']);
    }

    public function test_expired_course_can_be_permanently_deleted_and_audited(): void
    {
        $adminId = $this->createUser('admin@example.test', 'super_admin');
        $courseId = $this->createCourse();
        $itemId = $this->createRecycleItem('course', $courseId, 10, 31);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/recycle-bin/' . $itemId . '/permanent-delete')
            ->assertOk();

        $this->assertDatabaseMissing('courses', ['id' => $courseId]);
        $this->assertDatabaseHas('recycle_bin_items', [
            'id' => $itemId,
            'status' => 'purged',
            'purged_by' => $adminId,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $adminId,
            'action' => 'recycle_bin.permanently_deleted',
            'entity_id' => $courseId,
        ]);
    }

    public function test_permanent_delete_retains_course_when_foreign_key_references_exist(): void
    {
        $this->createUser('admin@example.test', 'super_admin');
        $courseId = $this->createCourse();
        $itemId = $this->createRecycleItem('course', $courseId, 10, 31);
        DB::table('course_enrollments')->insert(['course_id' => $courseId]);
        $this->login('admin@example.test');

        $this->postJson('/api/v1/recycle-bin/' . $itemId . '/permanent-delete')
            ->assertStatus(409);

        $this->assertDatabaseHas('courses', ['id' => $courseId]);
        $this->assertDatabaseHas('recycle_bin_items', [
            'id' => $itemId,
            'status' => 'active',
        ]);
        $this->assertNotNull(DB::table('recycle_bin_items')->where('id', $itemId)->value('purge_error'));
    }
}
