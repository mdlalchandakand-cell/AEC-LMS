# cPanel deployment notes

This guide describes the current PHP 8.3 / MySQL / React deployment layout. It is not proof that the LMS has passed a clean production deployment rehearsal. Keep the release-readiness audit open until the exact package has been installed and tested on a clean cPanel account.

## 1. Hosting prerequisites

Confirm the hosting account provides:

- PHP 8.3 selected for the domain.
- PHP extensions **pdo_mysql** and **mbstring**.
- MySQL 8 or compatible MariaDB with InnoDB and JSON support.
- Apache **mod_rewrite** and .htaccess overrides enabled.
- HTTPS with a valid certificate.
- cPanel Terminal/SSH access for CLI migration and administrator setup.

Do not use PHP's built-in development server for production.

## 2. Build the frontend

Build from a clean checkout using the committed lockfile:

```bash
bun install --frozen-lockfile
bun run lint
bun run build
```

Upload the **contents of the dist directory** to the domain document root (commonly public_html). Do not upload the source index.html in place of the built output; it references the development entry point.

The build copies public/.htaccess into dist so React routes can fall back to the built index.html.

## 3. Upload the PHP API and protected deployment files

Alongside the built frontend, upload these directories from the same release commit:

- api/
- database/
- scripts/
- storage/ (including `storage/private/.htaccess`, `storage/private/ebooks/.htaccess` and `storage/private/media/.htaccess`)

Keep the root .htaccess from the release. It allows the API and built assets to resolve while blocking direct web access to source code, SQL migrations, documentation, scripts, environment files and VCS metadata. Keep api/.htaccess, scripts/.htaccess and `storage/private/ebooks/.htaccess` in place. The private storage directories must be writable by the PHP process (directory mode 0750; uploaded files are stored as 0640). Keep the parent and child deny-all rules. Do not use 0777 permissions or remove these rules.

Do not upload node_modules, .git, local environment files, test dumps, or development-only files.

## 4. Create and configure the database

In cPanel:

1. Create a new MySQL database.
2. Create a dedicated database user with a strong unique password.
3. Grant that user the privileges needed by the LMS on that database.
4. Configure these values as private PHP/server environment variables:

- AEC_DB_HOST
- AEC_DB_NAME
- AEC_DB_USER
- AEC_DB_PASS
- Optional: AEC_DB_PORT (defaults to 3306)
- AEC_APP_URL (required canonical HTTPS URL of the public site; used in email verification and password-reset links)
- AEC_MAIL_FROM (required valid sender mailbox for account verification and recovery emails)

Use the hosting provider's supported PHP environment configuration. If the host requires SetEnv entries in .htaccess, keep the credentials out of Git and confirm with the host that PHP can read them through getenv(). Never put database credentials in VITE_* variables, frontend files, or a public JavaScript bundle. Confirm PHP mail() is enabled by the host and that the sender mailbox is authorized to send mail; the current account email transport uses PHP mail(), not SMTP credentials.

## 5. Apply the database migrations

From cPanel Terminal, change to the deployed project/document-root directory and inspect the migration plan:

```bash
php scripts/migrate.php --status
php scripts/migrate.php --dry-run
```

If the database and credentials are correct, apply the migrations:

```bash
php scripts/migrate.php
```

The CLI runner uses a MySQL advisory lock, records applied migration checksums in aec_schema_migrations, skips migrations already applied, and refuses to continue if an applied migration file has been changed or removed. Current migrations include 021_private_ebook_files.sql for protected e-book PDFs, 022_private_media_library.sql for protected course media, 025_teacher_commissions_and_payouts.sql for teacher assignments/payouts, 027_teacher_commission_period_precision_and_payout_permissions.sql for precise commission periods and accountant payout permissions, and 028_persistent_batches_and_routines.sql for academic batches and weekly schedules, and 029_persistent_recycle_bin.sql for retained deletion history. Never edit an applied migration; add a new numbered migration instead.

MySQL DDL may auto-commit. The runner does not provide transactional rollback. Back up the database before upgrades and inspect any failed migration before retrying.

## 6. Create the first super administrator

After the migrations succeed, run:

```bash
php scripts/create-admin.php
```

Enter the administrator name, email and a unique password of at least 12 characters when prompted. The script is CLI-only. Delete scripts/create-admin.php from the hosting account after creating the first administrator, and keep the scripts directory blocked from HTTP access.

## 7. Smoke checks

Before inviting students:

- Confirm the homepage and a nested React route load over HTTPS.
- Confirm /api/auth.php?action=me returns an unauthenticated response before login, not a PHP warning or HTML page.
- Sign in with the new super administrator.
- Confirm the course catalogue, CMS settings and admin dashboard load from the database.
- Submit a test admission inquiry and verify it appears in the admin admission inbox.
- Register a disposable student account, receive and use its email verification link, then test forgot-password and password reset email delivery.
- Confirm an unverified student cannot sign in and a successful password reset invalidates the student's previous session.
- Confirm a student cannot access a paid lesson without an active/completed enrollment.
- Confirm /scripts/migrate.php, /database/migrations/, /docs/, /.env.example and /api/_bootstrap.php are not downloadable through HTTP.
- Upload a test premium e-book PDF from the admin catalog, verify a student without a verified purchase receives HTTP 403, verify the purchaser can download it after staff verification, and confirm the stored file's direct `/storage/private/ebooks/...` URL returns HTTP 403.
- Create a test lesson and upload a PDF/image/audio/video asset through the Content Library; verify MIME restrictions, the 20 MB limit, authorized download, anonymous denial and direct `/storage/private/media/...` HTTP denial.

Use a disposable test student and remove test records before opening the site publicly.

## 8. Current release limitations

This guide does not close the remaining production gates. Public admission remains an inquiry workflow, not self-service registration or payment. Student registration, email verification and account recovery were merged and CI-validated in PR #42; production email delivery and the account lifecycle still require a real cPanel smoke test. Live payment-provider callbacks and automated refunds, full branch isolation, cPanel verification of the new private course-media storage, other operations modules, backup/restore, browser E2E/security checks and a clean cPanel rehearsal remain tracked in RELEASE-READINESS-AUDIT.md. Premium e-book PDFs use the private storage directory and entitlement-checked download API, but must be smoke-tested on the target host.

Do not label the repository or any ZIP as a ready-to-use full LMS until those gates have been completed and the exact package has passed a fresh cPanel installation and upgrade rehearsal.

## Private e-book PDF storage (migration 021)

- Apply all migrations through `021_private_ebook_files.sql` before enabling the e-book upload screen.
- Ensure PHP can write to `storage/private/ebooks` (directory mode `0750`; uploaded PDF files are stored with mode `0640`).
- Keep `storage/private/.htaccess` and the included `storage/private/ebooks/.htaccess` files in place. Direct HTTP access to private storage must return 403/404; do not remove the deny rules.
- Set PHP `upload_max_filesize` and `post_max_size` to at least `20M` (and ensure the web server request-body limit is also at least 20 MB).
- Upload a test PDF from the Admin → Storefront Catalog page, verify that the student cannot download it before payment verification, then verify the payment and test the authenticated download.
- On Nginx or any host that does not honor Apache `.htaccess`, move private storage outside the document root and update the storage path in `api/storefront.php` before production use.


## Private course media storage (migration 022)

- Apply migrations through `022_private_media_library.sql` before using file uploads in the reusable Content Library.
- Ensure PHP can write to `storage/private/media` (directory mode `0750`; uploaded files are stored with mode `0640`).
- Keep `storage/private/.htaccess` and `storage/private/media/.htaccess` in place. The entire `storage/private` tree must be denied by Apache; test direct URLs to uploaded files and confirm HTTP 403/404.
- Set PHP `upload_max_filesize` and `post_max_size` to at least `20M`; ensure the web server request-body limit is also at least 20 MB.
- The API currently allows JPG, PNG, WebP, GIF, PDF, MP3, M4A, OGG, MP4 and WebM. Download delivery requires an authenticated content manager or an enrolled student with access to the linked course.
- On Nginx or a host that does not honor Apache `.htaccess`, move private storage outside the document root and update the storage path in `api/media.php` and `api/storefront.php` before production use.
