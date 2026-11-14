<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CourseProgressController;
use App\Http\Controllers\Api\V1\ContentManagementController;
use App\Http\Controllers\Api\V1\CourseManagementController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\EnrollmentController;
use App\Http\Controllers\Api\V1\LiveClassController;
use App\Http\Controllers\Api\V1\TeacherCommissionController;
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

Route::prefix('api/v1/content-management')
    ->name('api.v1.content-management.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/', [ContentManagementController::class, 'index'])->name('index');
        Route::post('/', [ContentManagementController::class, 'store'])->name('store');
        Route::post('/attach', [ContentManagementController::class, 'attach'])->name('attach');
        Route::post('/detach', [ContentManagementController::class, 'detach'])->name('detach');
        Route::get('/{content}/links', [ContentManagementController::class, 'links'])->whereNumber('content')->name('links');
        Route::patch('/{content}', [ContentManagementController::class, 'update'])->whereNumber('content')->name('update');
        Route::delete('/{content}', [ContentManagementController::class, 'destroy'])->whereNumber('content')->name('destroy');
        Route::post('/{content}/restore', [ContentManagementController::class, 'restore'])->whereNumber('content')->name('restore');
    });

Route::prefix('api/v1/course-management')
    ->name('api.v1.course-management.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/', [CourseManagementController::class, 'index'])->name('index');
        Route::post('/', [CourseManagementController::class, 'store'])->name('store');
        Route::patch('/{course}', [CourseManagementController::class, 'update'])->whereNumber('course')->name('update');
        Route::delete('/{course}', [CourseManagementController::class, 'destroy'])->whereNumber('course')->name('destroy');
        Route::post('/{course}/restore', [CourseManagementController::class, 'restore'])->whereNumber('course')->name('restore');
    });

Route::prefix('api/v1/teacher-commissions')
    ->name('api.v1.teacher-commissions.')
    ->middleware(['auth', 'lms.session'])
    ->group(function (): void {
        Route::get('/summary', [TeacherCommissionController::class, 'summary'])->name('summary');
        Route::get('/assignments', [TeacherCommissionController::class, 'assignments'])->name('assignments');
        Route::post('/assignments', [TeacherCommissionController::class, 'assign'])->name('assignments.store');
        Route::post('/assignments/{assignment}/unassign', [TeacherCommissionController::class, 'unassign'])->whereNumber('assignment')->name('assignments.unassign');
        Route::get('/payouts', [TeacherCommissionController::class, 'payouts'])->name('payouts');
        Route::post('/payouts', [TeacherCommissionController::class, 'requestPayout'])->name('payouts.store');
        Route::post('/payouts/{payout}/review', [TeacherCommissionController::class, 'reviewPayout'])->whereNumber('payout')->name('payouts.review');
        Route::post('/payouts/{payout}/mark-paid', [TeacherCommissionController::class, 'markPaid'])->whereNumber('payout')->name('payouts.mark-paid');
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
