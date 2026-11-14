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

## Migration policy

Do not remove or redirect the existing `/api/*.php` endpoints until each matching Laravel implementation has:
1. equivalent authorization, branch scoping, CSRF/session or token semantics;
2. equivalent request/response contracts used by the React client;
3. database migration and rollback coverage;
4. feature tests for success, validation, forbidden access and cross-tenant access;
5. parity verification against the legacy endpoint.

The first Laravel milestone establishes the framework runtime and health tests only. It is not a claim that the legacy PHP modules have already been migrated. Existing production data must not be altered by the initial framework boot.
