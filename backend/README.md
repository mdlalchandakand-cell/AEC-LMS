# Laravel 12 backend foundation

This directory is the Laravel 12 application boundary for the LMS backend. The existing React/Vite client and legacy PHP API remain in place during the migration to avoid breaking current workflows.

## Requirements

- PHP 8.2+ (target hosting baseline: PHP 8.3)
- Composer 2 (dependency versions are pinned in the committed `composer.lock`)
- MySQL 8 / compatible MariaDB
- PHP extensions required by Laravel 12, including Ctype, cURL, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, Session, Tokenizer and XML; PDO MySQL is required for the target database.

## Install locally

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan test
php artisan serve
```

Health checks:
- `GET /` — backend identity and Laravel version
- `GET /api/v1/health` — JSON API health endpoint

## Laravel course catalog API (read-only migration slice)

- `GET /api/v1/courses` — published courses only; supports `q`, `category_id`, and `per_page` (1–50, default 12).
- `GET /api/v1/courses/{slug}` — published course details and published preview lessons only.

The catalog uses the existing `courses`, `course_categories`, `content_items`, and `course_content` tables. Soft-deleted records are excluded. Preview responses intentionally omit lesson body content and never return non-preview or unpublished lessons. No database migration is needed for this read-only slice.

## Laravel session authentication API

- `GET /api/v1/auth/csrf` — starts the Laravel web session and returns a CSRF token.
- `POST /api/v1/auth/login` — authenticates an existing LMS user by email and `password_hash`.
- `GET /api/v1/auth/me` — returns the signed-in user's safe profile and current CSRF token.
- `POST /api/v1/auth/logout` — invalidates the Laravel session.

Authentication uses a separate `aec_laravel_session` cookie and does not reuse or overwrite the legacy `AEC_LMS_SESSION` cookie. Disabled accounts are rejected, login attempts are limited per email/IP, and a changed `session_version` invalidates an existing Laravel session. Role, branch, active-status and session-version fields are not mass assignable.

For a frontend hosted on a different subdomain, configure exact trusted origins in `CORS_ALLOWED_ORIGINS` (comma-separated), set `SESSION_DOMAIN` to the parent domain (for example `.example.com`), keep `SESSION_SECURE_COOKIE=true`, and use HTTPS. The frontend must send credentials and the returned token in the `X-CSRF-TOKEN` header on state-changing requests. Do not use a wildcard origin with credentialed cookies.

## Migration policy

Do not remove or redirect the existing `/api/*.php` endpoints until each matching Laravel implementation has:
1. equivalent authorization, branch scoping, CSRF/session or token semantics;
2. equivalent request/response contracts used by the React client;
3. database migration and rollback coverage;
4. feature tests for success, validation, forbidden access and cross-tenant access;
5. parity verification against the legacy endpoint.

The first Laravel milestone establishes the framework runtime and health tests only. It is not a claim that the legacy PHP modules have already been migrated. Existing production data must not be altered by the initial framework boot.
