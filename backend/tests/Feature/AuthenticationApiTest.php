<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AuthenticationApiTest extends TestCase
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
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    private function createUser(array $overrides = []): int
    {
        return (int) DB::table('users')->insertGetId(array_merge([
            'name' => 'Laravel Test Student',
            'email' => 'laravel-student@example.test',
            'phone' => '01700000000',
            'password_hash' => Hash::make('Correct-Test-Password-123!'),
            'role' => 'student',
            'branch_id' => null,
            'is_active' => 1,
            'session_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    public function test_csrf_endpoint_issues_a_session_token(): void
    {
        $this->getJson('/api/v1/auth/csrf')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['csrf_token']]);
    }

    public function test_active_legacy_account_can_login_load_identity_and_logout(): void
    {
        $userId = $this->createUser();

        $this->postJson('/api/v1/auth/login', [
            'email' => ' LARAVEL-STUDENT@example.test ',
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.id', $userId)
            ->assertJsonPath('data.user.role', 'student')
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email', 'role'], 'csrf_token']])
            ->assertJsonMissingPath('data.user.password_hash');

        $this->assertAuthenticated();

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.id', $userId)
            ->assertJsonPath('data.user.email', 'laravel-student@example.test');

        $this->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertGuest();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_inactive_account_cannot_login_even_with_a_valid_password(): void
    {
        $this->createUser(['is_active' => 0]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'laravel-student@example.test',
            'password' => 'Correct-Test-Password-123!',
        ])->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid email or password.');

        $this->assertGuest();
    }

    public function test_session_version_change_invalidates_existing_login(): void
    {
        $userId = $this->createUser();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'laravel-student@example.test',
            'password' => 'Correct-Test-Password-123!',
        ])->assertOk();

        DB::table('users')->where('id', $userId)->update(['session_version' => 2]);

        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Your session has expired. Please sign in again.');

        $this->assertGuest();
    }

    public function test_login_attempts_are_limited_per_email_and_ip(): void
    {
        $this->createUser();
        $key = 'aec-login:' . hash('sha256', 'laravel-student@example.test|127.0.0.1');
        RateLimiter::clear($key);

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'laravel-student@example.test',
                'password' => 'incorrect-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'laravel-student@example.test',
            'password' => 'Correct-Test-Password-123!',
        ])->assertStatus(429)
            ->assertJsonPath('success', false);
    }

    public function test_login_validates_email_and_password_inputs(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
            'password' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }
}
