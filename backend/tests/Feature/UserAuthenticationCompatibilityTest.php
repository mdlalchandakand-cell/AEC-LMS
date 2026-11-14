<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAuthenticationCompatibilityTest extends TestCase
{
    public function test_user_model_uses_the_existing_lms_users_table_and_password_hash_column(): void
    {
        $user = new User([
            'name' => 'Legacy Student',
            'email' => 'legacy-student@example.test',
            'password_hash' => 'Existing-Plaintext-Password-123!',
        ]);

        $this->assertSame('users', $user->getTable());
        $this->assertSame('password_hash', $user->getAuthPasswordName());
        $this->assertSame($user->getAttribute('password_hash'), $user->getAuthPassword());
        $this->assertTrue(Hash::check('Existing-Plaintext-Password-123!', $user->getAuthPassword()));
        $this->assertContains('password_hash', $user->getHidden());
    }

    public function test_privilege_and_session_fields_are_not_mass_assignable(): void
    {
        $user = new User([
            'name' => 'Untrusted User',
            'email' => 'untrusted@example.test',
            'password_hash' => 'Password-123!',
            'role' => 'super_admin',
            'branch_id' => 999,
            'is_active' => 0,
            'session_version' => 100,
        ]);

        $this->assertNull($user->getAttribute('role'));
        $this->assertNull($user->getAttribute('branch_id'));
        $this->assertNull($user->getAttribute('is_active'));
        $this->assertNull($user->getAttribute('session_version'));
        $this->assertSame(
            ['name', 'email', 'phone', 'password_hash'],
            $user->getFillable()
        );
    }

    public function test_legacy_account_status_and_session_version_are_cast_safely(): void
    {
        $user = new User();
        $user->setRawAttributes([
            'is_active' => 1,
            'session_version' => '7',
        ]);

        $this->assertTrue($user->is_active);
        $this->assertSame(7, $user->session_version);
    }
}
