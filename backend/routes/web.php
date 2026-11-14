<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CourseProgressController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\EnrollmentController;
use App\Http\Controllers\Api\V1\LiveClassController;
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
        Route::post('/', [EnrollmentController::class, 'store'])->name('store');
        Route::patch('/{enrollment}', [EnrollmentController::class, 'update'])->whereNumber('enrollment')->name('update');
    });

Route::prefix('api/v1/guardians')
    ->name('api.v1.guardians.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/', [GuardianController::class, 'index'])->name('index');
        Route::get('/my-students', [GuardianController::class, 'myStudents'])->name('my-students');
        Route::post('/requests', [GuardianController::class, 'store'])->name('requests.store');
        Route::get('/incoming', [GuardianController::class, 'incoming'])->name('incoming');
        Route::get('/summary', [GuardianController::class, 'summary'])->name('summary');
        Route::post('/{link}/respond', [GuardianController::class, 'respond'])->whereNumber('link')->name('respond');
        Route::post('/{link}/revoke', [GuardianController::class, 'revoke'])->whereNumber('link')->name('revoke');
    });

Route::prefix('api/v1/courses')
    ->name('api.v1.courses.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/{course}/progress', [CourseProgressController::class, 'show'])->whereNumber('course')->name('progress');
    });

Route::prefix('api/v1/progress')
    ->name('api.v1.progress.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::post('/lessons', [CourseProgressController::class, 'update'])->name('lessons.update');
    });

Route::prefix('api/v1/live-classes')
    ->name('api.v1.live-classes.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/', [LiveClassController::class, 'index'])->name('index');
        Route::post('/', [LiveClassController::class, 'store'])->name('store');
        Route::patch('/{liveClass}', [LiveClassController::class, 'update'])->whereNumber('liveClass')->name('update');
        Route::post('/{liveClass}/cancel', [LiveClassController::class, 'cancel'])->whereNumber('liveClass')->name('cancel');
    });

Route::prefix('api/v1/payments')
    ->name('api.v1.payments.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/my', [PaymentController::class, 'my'])->name('my');
        Route::get('/', [PaymentController::class, 'index'])->name('index');
        Route::post('/', [PaymentController::class, 'store'])->name('store');
        Route::post('/{payment}/verify', [PaymentController::class, 'verify'])->whereNumber('payment')->name('verify');
        Route::post('/{payment}/reject', [PaymentController::class, 'reject'])->whereNumber('payment')->name('reject');
        Route::post('/{payment}/refund', [PaymentController::class, 'refund'])->whereNumber('payment')->name('refund');
        Route::get('/ledger', [PaymentController::class, 'ledger'])->name('ledger');
        Route::get('/reconcile', [PaymentController::class, 'reconcile'])->name('reconcile');
    });
