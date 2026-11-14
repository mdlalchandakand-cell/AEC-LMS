<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160);
            $table->string('email', 190)->unique();
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
            $table->string('name', 160);
            $table->boolean('is_active')->default(true);
        });
        DB::table('branches')->insert([
            ['id' => 10, 'name' => 'Branch 10', 'is_active' => 1],
            ['id' => 20, 'name' => 'Branch 20', 'is_active' => 1],
        ]);
        Schema::create('expense_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('name_bn', 120)->nullable();
            $table->string('code', 60)->unique();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });
        DB::table('expense_categories')->insert([
            ['id' => 1, 'name' => 'Rent', 'name_bn' => 'ভাড়া', 'code' => 'RENT', 'is_active' => 1, 'sort_order' => 1],
        ]);
        Schema::create('expenses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('BDT');
            $table->date('expense_date');
            $table->string('vendor', 160)->nullable();
            $table->string('payment_method', 32);
            $table->string('reference', 120)->nullable();
            $table->string('paid_reference', 120)->nullable()->unique();
            $table->string('status', 20)->default('pending');
            $table->string('rejection_reason', 500)->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('paid_by')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
        });
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 80)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('metadata')->nullable();
            $table->dateTime('created_at')->nullable();
        });
    }

    private function createUser(string $email, string $role, ?int $branchId = null): int
    {
        return (int) DB::table('users')->insertGetId([
            'name' => ucfirst($role),
            'email' => $email,
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => $role,
            'branch_id' => $branchId,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function grant(string $role, string $permission): void
    {
        DB::table('role_permissions')->updateOrInsert(
            ['role' => $role, 'permission_key' => $permission],
            ['allowed' => 1]
        );
    }

    private function login(string $email): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();
    }

    private function createExpense(int $creatorId, ?int $branchId, string $status = 'pending', string $method = 'Cash'): int
    {
        return (int) DB::table('expenses')->insertGetId([
            'category_id' => 1,
            'branch_id' => $branchId,
            'title' => 'Monthly rent',
            'amount' => '12000.00',
            'currency' => 'BDT',
            'expense_date' => '2026-11-01',
            'payment_method' => $method,
            'status' => $status,
            'created_by' => $creatorId,
            'created_at' => now(),
        ]);
    }

    public function test_branch_manager_can_only_view_expenses_for_their_branch(): void
    {
        $managerId = $this->createUser('manager@example.test', 'branch_manager', 10);
        $this->grant('branch_manager', 'expenses.view');
        $this->grant('branch_manager', 'expenses.manage');
        $this->createExpense($managerId, 10);
        $this->createExpense($managerId, 20);

        $this->login('manager@example.test');
        $response = $this->getJson('/api/v1/expenses');
        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(10, (int) $response->json('data.data.0.branch_id'));
    }

    public function test_accountant_can_create_pending_expense_and_audit_it(): void
    {
        $this->createUser('accountant@example.test', 'accountant', 10);
        $this->grant('accountant', 'expenses.manage');
        $this->login('accountant@example.test');

        $response = $this->postJson('/api/v1/expenses', [
            'category_id' => 1,
            'title' => 'Office rent',
            'amount' => '12000.50',
            'expense_date' => '2026-11-10',
            'payment_method' => 'Bank Transfer',
            'reference' => 'INV-RENT-11',
        ]);
        $response->assertCreated()->assertJsonPath('data.status', 'pending');
        $id = (int) $response->json('data.id');
        $this->assertDatabaseHas('expenses', ['id' => $id, 'amount' => '12000.50', 'branch_id' => 10, 'status' => 'pending']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'expense.created', 'entity_id' => $id]);
    }

    public function test_expense_requires_approval_before_payment_and_non_cash_reference(): void
    {
        $this->createUser('approver@example.test', 'accountant', 10);
        $this->grant('accountant', 'expenses.approve');
        $this->grant('accountant', 'expenses.pay');
        $expenseId = $this->createExpense(1, 10, 'pending', 'Bank Transfer');

        $this->login('approver@example.test');
        $this->postJson("/api/v1/expenses/{$expenseId}/mark-paid", [])
            ->assertStatus(409);

        $this->postJson("/api/v1/expenses/{$expenseId}/review", ['decision' => 'approved'])
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->postJson("/api/v1/expenses/{$expenseId}/mark-paid", [])
            ->assertStatus(422);

        $this->postJson("/api/v1/expenses/{$expenseId}/mark-paid", ['paid_reference' => 'BANK-TXN-001'])
            ->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('expenses', [
            'id' => $expenseId,
            'status' => 'paid',
            'paid_reference' => 'BANK-TXN-001',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'expense.approved', 'entity_id' => $expenseId]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'expense.paid', 'entity_id' => $expenseId]);
    }

    public function test_user_without_expense_permission_is_forbidden(): void
    {
        $this->createUser('teacher@example.test', 'teacher', 10);
        $this->login('teacher@example.test');
        $this->getJson('/api/v1/expenses')->assertForbidden();
    }
}
