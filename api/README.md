# Alom's English Center — PHP API

Target runtime: PHP 8.3+, PDO MySQL, MySQL 8 / compatible MariaDB with InnoDB, HTTPS.

## Guardian portal

`guardians.php` provides consent-based guardian/student links. Guardians can request access using a student's account email, but no student data is returned while the request is pending. The student must accept the request from the student dashboard. Either side can revoke an active link; revocation immediately blocks summary access.

- `GET /api/guardians.php?action=my_students` — guardian's own pending and active links.
- `POST /api/guardians.php?action=request` — guardian requests a link with `student_email` and `relationship`.
- `GET /api/guardians.php?action=incoming` — student's pending incoming requests.
- `POST /api/guardians.php?action=respond&id={id}` — student accepts or rejects with `decision`.
- `POST /api/guardians.php?action=revoke&id={id}` — linked guardian or student revokes access.
- `GET /api/guardians.php?action=summary&student_id={id}` — guardian reads the linked student's courses, attendance, submitted exam results, payments, and certificates.
- `GET /api/guardians.php?action=list` — administrator/branch-manager link review list, filtered by branch for branch managers.

Guardian/student links require both accounts to be in the same active branch. The API enforces the relationship server-side; client-provided student IDs alone never grant access. Link requests are audited and student consent is mandatory before any progress, attendance, result, payment, or certificate record is disclosed.

## Server configuration

Set these values in the hosting environment or in a server-side configuration file outside the public web root:

- `AEC_DB_HOST`
- `AEC_DB_NAME`
- `AEC_DB_USER`
- `AEC_DB_PASS`
- `AEC_APP_URL` — canonical HTTPS site URL used for verification and password-reset links.
- `AEC_MAIL_FROM` — valid sender mailbox for account verification and recovery emails.

Never place database credentials in a `VITE_*` variable, JavaScript bundle, Git commit, or public directory.

## Implemented API areas

- Authentication and student accounts: `auth.php`, `accounts.php` — session login, registration, verification, recovery, own profile and audited activation.
- Branch registry: `branches.php` — administrator branch CRUD, branch deactivation without deleting history, and branch-manager own-branch read access.
- Courses/categories: `courses.php`, `categories.php` — catalogue, course CRUD and category management. Branch managers can manage only courses and categories assigned to their own active branch; global categories remain shared and cannot be edited by branch managers.
- Reusable content: `content.php` — lessons/articles/videos, multi-course links and student progress/notes. This content library remains global; branch managers are intentionally not granted content-management permission.
- Users/enrollment: `users.php`, `enrollments.php` — admin and branch-scoped user management, enrollment records and branch ownership checks.
- Payments: `payments.php` — manual payment submission, branch-scoped review, provider-confirmed refund recording, double-entry refund reversals, student payment history and branch-filtered ledger views.
- Exams/question bank: `exams.php`, `question_bank.php` — timed attempts, autosaved answers, server-side grading and reusable questions. Branch-manager exam/question-bank permissions remain disabled until those APIs receive complete branch scoping.
- Attendance: `attendance.php` — branch-scoped roster, daily attendance upsert, reports and student-owned history.
- Certificates: `certificates.php` — issuance, student wallet, public verification, revocation and branch-scoped management.
- Live classes: `live_classes.php` — persistent schedule, instructor ownership, enrolled-student visibility, audited lifecycle actions and branch scoping.
- Notifications: `notifications.php` — per-user persistent inbox, read/unread state, user-owned deletion and admin-only role-targeted broadcasts. In-app delivery only; no email or SMS is sent by this endpoint.
- Website CMS: `cms.php` — public website settings, blog posts, SEO metadata and testimonials; homepage section visibility, theme tokens, e-book catalog and product catalog settings are validated and persisted.
- Admission inquiries: `admissions.php` — public application intake with rate limiting and admin-only review; does not create accounts or accept/verify payments.

## Useful routes

- `GET /api/branches.php?action=list` — administrator branch list; branch managers receive only their assigned branch.
- `POST /api/branches.php?action=create` — `branches.manage` + CSRF.
- `POST /api/branches.php?action=update&id=123` — `branches.manage` + CSRF.
- `POST /api/branches.php?action=deactivate&id=123` — `branches.manage` + CSRF; preserves historical records.
- `GET /api/attendance.php?action=roster&course_id=123&date=YYYY-MM-DD` — `attendance.manage`; branch managers are restricted to their own course branch.
- `POST /api/attendance.php?action=save` — `attendance.manage` + CSRF and branch/enrollment checks.
- `GET /api/attendance.php?action=my` — authenticated user's own history.
- `POST /api/admissions.php?action=submit` — public inquiry; rate-limited; pending status only.
- `GET /api/admissions.php?action=list` — `admissions.manage`.
- `POST /api/admissions.php?action=update&id=123` — `admissions.manage` + CSRF.
- `POST /api/accounts.php?action=register` — public; creates an inactive student pending email verification.
- `POST /api/accounts.php?action=verify_email` and `POST /api/accounts.php?action=resend_verification` — public, single-use token and rate-limited generic resend response.
- `POST /api/accounts.php?action=request_password_reset` and `POST /api/accounts.php?action=reset_password` — public, generic response, hashed expiring single-use token.
- `GET/POST /api/accounts.php?action=profile` — authenticated; profile writes require CSRF.
- `POST /api/accounts.php?action=admin_activate&id=123` — `users.manage` + CSRF; verified student only.
- `GET /api/live_classes.php?action=list` — students see enrolled-course sessions; teachers see their own sessions; branch managers see their branch; administrators see all.
- `POST /api/live_classes.php?action=create` — `live_classes.manage` + CSRF; validates course, instructor, Bangladesh-local date/time and provider HTTPS URL.
- `POST /api/live_classes.php?action=update&id=123` — `live_classes.manage` + CSRF; validates status transition and optional HTTPS recording URL.
- `POST /api/live_classes.php?action=cancel&id=123` — `live_classes.manage` + CSRF; cancellation is audited, not hard-deleted.
- `GET /api/notifications.php?action=list` — authenticated user's own inbox with unread count.
- `POST /api/notifications.php?action=mark_read&id=123` — authenticated user marks only their own notification as read.
- `POST /api/notifications.php?action=mark_all_read` — marks the authenticated user's unread notifications as read.
- `POST /api/notifications.php?action=delete&id=123` — soft-deletes only the authenticated user's notification.
- `POST /api/notifications.php?action=broadcast` — `notifications.broadcast` + CSRF; sends an in-app announcement to active users in the selected role audience; capped at 10,000 recipients and 20 broadcasts per admin per hour.
- `POST /api/payments.php?action=refund&id=123` — `payments.manage` + CSRF; records a refund only after staff have processed it with the external provider, requires the provider refund reference and reason, and posts a balanced reversing journal.
- `GET /api/payments.php?action=reconcile` — `payments.manage`; reports unbalanced or incomplete journals without modifying ledger data.
- `POST /api/storefront.php?action=ebook_submit` — authenticated + CSRF; submits a bKash/Nagad reference using the price stored in public CMS settings. The e-book is not unlocked until a staff member verifies the transaction.
- `GET /api/storefront.php?action=my_ebooks` — authenticated; returns verified e-book entitlements and available private-file IDs.
- `GET /api/media.php?action=list&content_id=123`, `POST /api/media.php?action=upload`, `GET /api/media.php?action=download&id=123`, and `POST /api/media.php?action=delete` — `content.manage` for library management; upload private course media (JPG, PNG, WebP, GIF, PDF, MP3, M4A, OGG, MP4 and WebM; maximum 20 MB). Downloads require an authenticated content manager or an enrolled student with access to the linked course. Files are stored under `storage/private/media`, outside the public web root; the API checks MIME type and streams files with private/no-store headers. Migration 022 creates the media metadata table.
- `GET /api/storefront.php?action=ebook_files` and `POST /api/storefront.php?action=ebook_upload` — `cms.manage`; upload/list private PDF assets (PDF MIME/signature checked, maximum 20 MB).
- `GET /api/storefront.php?action=ebook_download&id=ebook-id` — authenticated; streams private PDFs only to administrators, free e-book users, or students with a verified purchase.
- `GET /api/storefront.php?action=ebook_orders` and `POST /api/storefront.php?action=ebook_verify|ebook_reject&id=123` — `storefront.orders.manage`; staff review of manual e-book payments.
- `POST /api/storefront.php?action=product_submit` — authenticated + CSRF; creates a cash-on-delivery order using the server-side CMS product price and stock flag.
- `GET /api/storefront.php?action=product_orders` and `POST /api/storefront.php?action=product_update&id=123` — `storefront.orders.manage`; staff fulfilment queue and status updates.

Authenticated write requests require the `X-CSRF-Token` header returned by login/session endpoints. Password resets/changes, account deactivation/reactivation, role changes and student email changes revoke old sessions through a per-user session version. Session cookies are HttpOnly, SameSite and secure when served over HTTPS. Permission checks are enforced server-side; hiding a dashboard control is not authorization.

## Schema migrations

For a new or existing deployment, configure private server-side values `AEC_DB_HOST`, `AEC_DB_NAME`, `AEC_DB_USER`, `AEC_DB_PASS` (and optional `AEC_DB_PORT`) and run the migration runner from SSH/Terminal in the project root:

```bash
php scripts/migrate.php --status
php scripts/migrate.php --dry-run
php scripts/migrate.php
```

The runner is CLI-only, obtains a MySQL advisory lock, applies migrations in filename order, records SHA-256 checksums in `aec_schema_migrations`, skips already-applied files, and refuses to run if an applied migration file has been edited or removed. Add a new numbered migration instead of changing an applied file. MySQL DDL may auto-commit, so a failed migration must be inspected and safely rerun; the runner does not claim transactional rollback.

Migrations are applied in filename order. Current application schema includes `001_core_schema.sql` through `021_private_ebook_files.sql`. Migration 017 creates the branch registry, imports existing branch identifiers, adds branch ownership/FKs to users, courses, categories, enrollments, payments, attendance, certificates and live classes, and seeds branch-scoped manager permissions. Migration 018 adds provider-confirmed refunds, reversal journal references, payment refund status and ledger integrity checks. Migration 019 adds the persistent per-user notification inbox and administrator broadcast permission. Migration 020 adds persistent e-book payment requests and product orders with admin review permissions. Migration 021 adds private PDF file metadata for authenticated upload and entitlement-checked download. These migrations are designed to be safely rerunnable.

## Authorization and remaining limitations

Branch managers are scoped server-side to their assigned branch for users, courses, categories, enrollments, payments, attendance, certificates and live classes. They cannot manage the global branch registry or shared content library. Branch-manager permissions for exams, question bank, CMS, global reporting and other modules remain disabled until those endpoints have equivalent branch scoping. A missing branch assignment is denied, not treated as global access.

This is not yet a production-ready full LMS. Remaining release gates include optional MFA; production email delivery smoke tests on cPanel; complete branch scoping for exams, question bank, reusable content, notifications, reports, commissions and facilities; production media upload and private file delivery; live payment gateway callbacks/signature verification, automated provider refunds, cash desk and invoices; stronger immutable-ledger enforcement and external bank/provider reconciliation; full installer and upgrade/rollback tooling; backup/restore; browser E2E/security testing; and a clean cPanel deployment rehearsal. The refund API records a refund only after staff have processed it externally; it does not call bKash, Nagad or a bank API. E-book payment references are also manually verified by staff; there is no automatic bKash/Nagad gateway callback. Premium PDF files are stored under `storage/private/ebooks` with direct Apache access denied; downloads are streamed only after entitlement checks. The administrator still needs to upload the real PDF assets. Notification broadcasts are in-app only; cPanel SMTP/email delivery, SMS delivery, scheduled digests and provider delivery receipts remain separate release gates. A CLI migration runner and Apache access-control/SPA rules exist; these do not replace a full installer. Do not treat the project as ready to deploy until those gates pass.

## Certificate registry

Migration: `database/migrations/014_certificates.sql`; branch ownership is added by migration 017.

- `GET /api/certificates.php?action=verify&cert_no=...` — public credential lookup; returns only public fields and marks revoked credentials invalid.
- `GET /api/certificates.php?action=my` — authenticated student's own certificate wallet.
- `GET /api/certificates.php?action=list&q=...` — `certificates.manage`; branch managers receive only their branch.
- `GET /api/certificates.php?action=students&q=...` — permission-protected active student search, branch-filtered for branch managers.
- `POST /api/certificates.php?action=issue` — `certificates.manage` + CSRF; requires active enrolment and course completion.
- `POST /api/certificates.php?action=revoke&id=...` — `certificates.manage` + CSRF; requires a reason and writes an audit event.

Certificate numbers use 128 bits of cryptographic randomness. One certificate record is allowed per student/course pair; revocation is permanent and remains visible in public verification.
