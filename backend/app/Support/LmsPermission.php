<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class LmsPermission
{
    public static function allows(User $user, string $permission): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        return DB::table('role_permissions')
            ->where('role', $user->role)
            ->where('permission_key', $permission)
            ->where('allowed', 1)
            ->exists();
    }
}
