<?php

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
