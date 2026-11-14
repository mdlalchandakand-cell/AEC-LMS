<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureLmsSessionVersion
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
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
