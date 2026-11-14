<?php

use App\Http\Controllers\Api\V1\CourseCatalogController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'service' => 'aec-laravel-api',
        'framework' => 'Laravel',
        'version' => app()->version(),
    ]);
})->name('api.health');

Route::get('/courses', [CourseCatalogController::class, 'index'])
    ->name('api.v1.courses.index');
Route::get('/courses/{slug}', [CourseCatalogController::class, 'show'])
    ->where('slug', '[A-Za-z0-9][A-Za-z0-9_-]*')
    ->name('api.v1.courses.show');
