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
- `POST /api/v1/auth/change-password` — verifies the current password, stores a new hash, increments `session_version`, rotates the current session and writes an audit log.

## Laravel enrollment API

- `GET /api/v1/enrollments/my` — returns only the signed-in student's own enrollments and hides enrollments whose course has been soft-deleted.
- `GET /api/v1/enrollments` — permission-checked enrollment list with optional status filter and pagination; branch managers are restricted to their own active branch.
- `POST /api/v1/enrollments` — creates an enrollment for an active student in a published course; enforces branch ownership, prevents duplicate student/course pairs, and records an audit event.
- `PATCH /api/v1/enrollments/{id}` — updates status, start/end dates and notes; enforces permission and branch scope, and records an audit event.

These routes require an authenticated Laravel session with a current `session_version`. Student responses contain course and enrollment status details only; the administrative list includes student identity and internal notes. The create/update actions do not process payments or grant access based on payment status. Payment verification and gateway workflows remain on the legacy API until their write rules and parity tests are migrated.

## Laravel payment API

- `GET /api/v1/payments/my` — returns only the signed-in student's payment history and completed refund totals.
- `GET /api/v1/payments` — requires the `payments.manage` permission; branch managers must be assigned to an active branch and see only that branch's payments.
- `POST /api/v1/payments` — lets a student submit a manual bKash, Nagad or bank-transfer payment for a published course. The API validates the amount against the remaining course fee, counts pending/verified payments net of completed refunds, checks active branch ownership, and prevents reuse of a method/transaction reference.
- `POST /api/v1/payments/{id}/verify` — permission-checks and locks a pending payment, posts balanced debit/credit ledger entries, records an audit event and student notification, and activates course enrollment only after the net verified total covers the course fee.
- `POST /api/v1/payments/{id}/reject` — requires a non-blank reason, updates only a pending payment, and records an audit event and student notification.
- `POST /api/v1/payments/{id}/refund` — records a refund only after the external provider has completed it; requires the provider refund reference, amount and reason, prevents over-refunds, posts a balanced reversal journal, updates payment status, and cancels course access when net paid fees fall below the course fee.
- `GET /api/v1/payments/ledger` — returns payment and refund journal entries with account, student and course context; branch managers see only their assigned branch.
- `GET /api/v1/payments/reconcile` — checks journal entry count and debit/credit equality, returning any discrepancies within the caller's permitted branch scope.

Amounts and refund totals are serialized consistently as two-decimal BDT values. Provider callbacks and automated provider-side refund execution remain outside this Laravel slice; the refund endpoint records a provider-confirmed transaction and does not call bKash, Nagad or a bank API.

Authentication uses a separate `aec_laravel_session` cookie and does not reuse or overwrite the legacy `AEC_LMS_SESSION` cookie. Disabled accounts are rejected, login attempts are limited per email/IP, and a changed `session_version` invalidates an existing Laravel session. Role, branch, active-status and session-version fields are not mass assignable.

For a frontend hosted on a different subdomain, configure exact trusted origins in `CORS_ALLOWED_ORIGINS` (comma-separated), set `SESSION_DOMAIN` to the parent domain (for example `.example.com`), keep `SESSION_SECURE_COOKIE=true`, and use HTTPS. The frontend must send credentials and the returned token in the `X-CSRF-TOKEN` header on state-changing requests. Do not use a wildcard origin with credentialed cookies.

## Migration policy

Do not remove or redirect the existing `/api/*.php` endpoints until each matching Laravel implementation has:
1. equivalent authorization, branch scoping, CSRF/session or token semantics;
2. equivalent request/response contracts used by the React client;
3. database migration and rollback coverage;
4. feature tests for success, validation, forbidden access and cross-tenant access;
5. parity verification against the legacy endpoint.

The current Laravel slice establishes the framework runtime plus tested authentication, public course catalog, enrollment read/create/update, payment history, manual payment submission, payment verification, rejection and provider-confirmed refund recording endpoints. It is not a claim that the legacy PHP modules have already been fully migrated. Existing production data must not be altered by the initial framework boot.
