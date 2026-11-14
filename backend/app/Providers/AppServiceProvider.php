<?php

namespace App\Providers;

use App\Auth\LmsUserProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Auth::provider('aec-users', function ($app, array $config): LmsUserProvider {
            return new LmsUserProvider($app['hash'], $config['model']);
        });
    }
}
