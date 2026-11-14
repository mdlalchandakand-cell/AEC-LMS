<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'CSRF token issued.',
            'data' => ['csrf_token' => $request->session()->token()],
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:190'],
            'password' => ['required', 'string', 'max:4096'],
        ]);

        $email = mb_strtolower(trim($validated['email']));
        $rateKey = 'aec-login:' . hash('sha256', $email . '|' . (string) $request->ip());

        if (RateLimiter::tooManyAttempts($rateKey, 8)) {
            return response()->json([
                'success' => false,
                'message' => 'Too many login attempts. Try again in 15 minutes.',
                'error' => 'Too many login attempts.',
            ], 429)->header('Retry-After', (string) RateLimiter::availableIn($rateKey));
        }

        if (!Auth::guard('web')->attempt([
            'email' => $email,
            'password' => $validated['password'],
        ])) {
            RateLimiter::hit($rateKey, 900);

            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
                'error' => 'Invalid email or password.',
            ], 401);
        }

        RateLimiter::clear($rateKey);
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        /** @var User $user */
        $user = Auth::guard('web')->user();
        $request->session()->put('aec_session_version', (int) $user->session_version);

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => $this->userPayload($user),
                'csrf_token' => $request->session()->token(),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Authenticated user loaded.',
            'data' => [
                'user' => $this->userPayload($user),
                'csrf_token' => $request->session()->token(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
            'data' => null,
        ]);
    }

    private function userPayload(User $user): array
    {
        return $user->only([
            'id',
            'name',
            'email',
            'phone',
            'role',
            'branch_id',
        ]);
    }
}
