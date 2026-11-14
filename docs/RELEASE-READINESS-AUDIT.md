# Release-readiness audit — Alom's English Center LMS

**Audit date:** 2026-11-13  
**Repository:** `mdlalchandakand-cell/AEC-LMS`  
**Audited baseline:** `07eff82e3fe4d8a66286ae2d57943d7e1715d517`  
**Release decision:** **Not production-ready. Keep on staging until the gates below are closed.**

## Executive summary

The repository now contains a substantial PHP API, versioned MySQL migrations, a React/Vite dashboard and a CI-built cPanel deployment bundle. The merged baseline passed PHP 8.3 syntax and migration-safety checks, MySQL schema/API integration tests, frontend type-check/build and CodeQL. The cPanel ZIP workflow also built and inspected a package containing the real application files and excluding environment files.

These checks do not prove that the application installs cleanly on a real cPanel account, that real email/payment providers work, or that every browser journey is secure. Do not describe the current ZIP as a fully rehearsed production installation.

## Implemented API-backed areas

The current `api/` directory contains persistent endpoints for:

- Authentication and account lifecycle: login/session, registration, email verification and password recovery.
- Users, branches, categories, courses, course content, enrolments and lesson progress.
- Manual payment submissions, staff verification, ledger records, refunds and reversals.
- Exams, question bank, attendance, live classes, notifications and marksheets.
- CMS settings/posts/testimonials and public admission inquiries.
- Certificates, public verification and revocation.
- Guardian-to-student links with consent, approval and revocation controls.
- Storefront orders, private e-book PDFs and private course-media upload/delivery.
- Teacher-course commission periods, refund-adjusted commission balances and payout requests/review.
- Academic batches, eligible-student placement, rosters, capacity checks and weekly routine slots.
- A 30-day recycle bin with scoped restore and administrator-only dependency-safe permanent purge.

Important module behavior now covered by integration tests:

- Teacher assignment/rate changes create dated periods; verified payments are attributed to the period active at review time. Unassignment or later rate changes do not erase prior earnings.
- Completed refunds reduce commission. Payout requests reserve balances, and approval/settlement re-checks the available amount. Accountants can manage payout decisions but cannot change teacher assignments or rates.
- Batch placement requires an active/completed course enrolment, respects capacity and branch scope, and hides student batch/routine access when course access is cancelled.
- Routine creation checks instructor/room overlaps and serializes schedule writes to reduce concurrent booking races.
- Recycle-bin entries are recorded atomically with soft deletes; expired records with linked foreign-key history are retained, and branch managers cannot purge.
- Private e-book and course-media files use protected storage and authorization-aware download endpoints; the target host still needs direct-URL denial tests.

An API file or a green integration test does not mean the corresponding workflow has passed full browser E2E or production-host verification.

## Current CI evidence

The merged baseline `07eff82e` passed:

| Check | Result |
|---|---|
| PHP 8.3 syntax and migration safety | Passed |
| MySQL migration/schema integration | Passed |
| PHP HTTP API integration suite | Passed |
| Frontend install, type-check and production build | Passed |
| CodeQL JavaScript/TypeScript analysis | Passed |
| CodeQL GitHub Actions analysis | Passed |
| cPanel release ZIP assembly and contents/secret inspection | Passed |

The cPanel workflow assembles the built `dist/` frontend with the real `api/`, `database/`, production CLI scripts, protected `storage/` rules and deployment documentation. It excludes `.env` files, VCS metadata, dependencies, logs and test-only scripts. Workflow artifacts expire after 14 days; create a tagged release or rerun the workflow when a fresh artifact is needed.

## Remaining release gates

| Area | Remaining work before production |
|---|---|
| cPanel installation | Install the exact ZIP on a clean staging account; verify PHP 8.3, PDO MySQL, mbstring, Apache rewrite, environment variables, permissions, SPA routes and upgrade path. |
| Email | Verify sender domain/mailbox and complete registration, verification, resend and password-recovery smoke tests on the real host. Current transport uses PHP `mail()`, not a configured SMTP provider. |
| Payments | Current bKash/Nagad/bank flow is staff-reviewed. Implement and verify provider callbacks/signatures, idempotency, automated settlement/refund handling, receipts and reconciliation before claiming gateway automation. |
| Teacher payouts | Transfers are manual. Verify the actual bank/mobile-wallet process and reconcile external references; no automatic payout provider is connected. |
| Recycle bin | 30-day retention, scoped restore and dependency-aware purge are implemented; scheduled retention cadence and browser E2E remain to be verified on the target host. |
| Backup and upgrades | Add and rehearse backup/restore, installation lock, upgrade/rollback and recovery procedures. The current first-admin and migration setup is CLI-based. |
| Browser QA | Run browser E2E for student, guardian, teacher, accountant, branch-manager and administrator journeys; include accessibility, responsive layout and security checks. |
| Branch isolation | Complete a module-by-module authorization audit, especially cross-branch reads/writes and staff/student data visibility. Existing scoped checks are not a blanket isolation certification. |
| Private files | On the target cPanel host, verify upload size/MIME rules, authenticated downloads, 403/404 direct URLs and permissions for e-book/media storage. Hosts that ignore Apache `.htaccess` need private storage outside the document root. |
| Remaining modules | Reporting, expenses, library, hostel, transport and SaaS administration still need persistent backend workflows and integration/E2E coverage. |
| Legacy demo state | `LmsContext` still contains demo/legacy records for some modules. Each remaining screen must be checked so local demo state is not mistaken for persistent production data. |

## Deployment requirements and safety

The current deployment guide is `docs/CPANEL-DEPLOYMENT.md`. It requires PHP 8.3, `pdo_mysql`, `mbstring`, MySQL 8 or compatible MariaDB, Apache rewrite support, HTTPS and cPanel Terminal/SSH.

The current deployment process is not a browser-based three-step installer:

1. Upload the contents of the production `dist/` directory to the document root.
2. Upload `api/`, `database/`, `scripts/`, `storage/` and the matching root access-control files.
3. Configure the `AEC_DB_*`, `AEC_APP_URL` and `AEC_MAIL_FROM` server environment variables.
4. Inspect migrations with `php scripts/migrate.php --status` and `--dry-run`; back up the database before applying them.
5. Apply migrations and create the first super administrator from cPanel Terminal.
6. Remove `scripts/create-admin.php` after initial setup and run the documented smoke checks.

Never put database credentials in frontend variables or browser bundles. Do not import legacy/demo SQL containing destructive `DROP TABLE` statements. Keep private-storage deny rules and do not use `0777` permissions.

## Final recommendation

Continue development and verification on staging. The merged code and CI checks are a meaningful improvement, but **the LMS must remain marked pre-release** until the exact deployment ZIP passes a clean cPanel installation/upgrade rehearsal and the remaining email, payment, backup, browser E2E, private-file and branch-isolation gates are closed.
