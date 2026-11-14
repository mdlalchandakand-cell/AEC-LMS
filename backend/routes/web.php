<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EnrollmentController;
use App\Http\Controllers\Api\V1\PaymentController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => config('app.name'),
        'framework' => 'Laravel',
        'version' => app()->version(),
        'status' => 'ok',
        'message' => 'Laravel backend foundation is running.',
    ]);
})->name('backend.home');

Route::prefix('api/v1/auth')->name('api.v1.auth.')->group(function (): void {
    Route::get('/csrf', [AuthController::class, 'csrf'])->name('csrf');
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    Route::middleware(['auth', 'lms.session'])->group(function (): void {
        Route::get('/me', [AuthController::class, 'me'])->name('me');
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        Route::post('/change-password', [AuthController::class, 'changePassword'])->name('change-password');
    });
});

Route::prefix('api/v1/enrollments')
    ->name('api.v1.enrollments.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/my', [EnrollmentController::class, 'my'])->name('my');
        Route::get('/', [EnrollmentController::class, 'index'])->name('index');
    });

Route::prefix('api/v1/payments')
    ->name('api.v1.payments.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/my', [PaymentController::class, 'my'])->name('my');
        Route::get('/', [PaymentController::class, 'index'])->name('index');
    });
