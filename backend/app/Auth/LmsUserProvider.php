<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class LmsUserProvider extends EloquentUserProvider
{
    /**
     * Disabled LMS accounts must never authenticate, even with a valid hash.
     */
    public function validateCredentials(Authenticatable $user, array $credentials): bool
    {
        if (!(bool) $user->getAttribute('is_active')) {
            return false;
        }

        return parent::validateCredentials($user, $credentials);
    }
}
