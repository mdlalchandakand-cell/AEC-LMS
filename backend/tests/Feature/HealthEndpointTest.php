<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    public function test_laravel_health_endpoint_returns_success(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('service', 'aec-laravel-api');
    }

    public function test_backend_home_reports_laravel_version(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertJsonPath('framework', 'Laravel')
            ->assertJsonPath('status', 'ok');
    }
}
