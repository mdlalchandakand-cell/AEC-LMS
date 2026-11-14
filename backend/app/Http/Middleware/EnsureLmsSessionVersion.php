<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureLmsSessionVersion
{
    public function handle(Request $request, Closure $next): Response
    {
        // Reload the record so account deactivation and session_version changes
        // made by an administrator or password-reset flow take effect now.
        $authenticatedUser = $request->user();
        $user = $authenticatedUser
            ? User::query()->find($authenticatedUser->getAuthIdentifier())
            : null;

        if ($user) {
            Auth::guard('web')->setUser($user);
        }
        $sessionVersion = $request->session()->get('aec_session_version');

        if (
            !$user
            || !(bool) $user->is_active
            || $sessionVersion === null
            || (int) $sessionVersion !== (int) $user->session_version
        ) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'success' => false,
                'message' => 'Your session has expired. Please sign in again.',
                'error' => 'Authentication required.',
            ], 401);
        }

        return $next($request);
    }
}
