<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('aec:about', function () {
    $this->info('Aloms English Center Laravel backend foundation');
})->purpose('Display the LMS backend foundation status');
