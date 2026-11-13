# Backend architecture and release gates

## First implementation slice
- PHP 8.3+ API with PDO prepared statements and MySQL/MariaDB.
- Server-side sessions with HttpOnly, SameSite cookies, session ID rotation and CSRF token checks for state-changing requests.
- Login throttling by account and IP, password hashing using PHP's password API, and generic invalid-credential responses.
- Role-permission lookup with a super-admin override; default course-management grants are narrowly scoped.
- Course create/update/soft-delete and public published-course listing/detail.
- Reusable content model: `content_items` and the many-to-many `course_content` relation.
- Audit log storage and login-attempt tracking schema.
- CLI-only first super-admin creation; no public bootstrap administrator endpoint.
- Directory access restrictions for SQL migrations and operational scripts.

## Important current limitations
The React context still contains legacy demo/localStorage records for modules that have not yet been migrated. Active API-backed workflows include authentication/student accounts, courses/categories/reusable content, enrollments, manual payments, provider-confirmed refund recording, balanced reversal journals and ledger reconciliation, exams/question bank, attendance, CMS, admission inquiries, certificates, live classes and persistent in-app notifications. Branch registry and branch-scoped access are implemented for users, courses, categories, enrollments, payments, attendance, certificates and live classes. Branch managers are intentionally not granted global content, exam, question-bank, CMS or reporting permissions until those APIs have equivalent scope checks. Reporting, teacher commissions/payouts, library/hostel/transport, general course/lesson media uploads/downloads, live payment gateway callbacks/signature verification, automated provider refunds, notification email/SMS delivery and complete all-module branch scoping remain incomplete. Premium e-book PDFs have a dedicated private upload and entitlement-checked download workflow; actual production assets and cPanel permission smoke tests remain. The cPanel installer, backup/restore/rollback, browser E2E, security scans and clean production deployment rehearsal remain release blockers.

## Production release gates
1. Complete and test all API modules with tenant/branch scoping and authorization tests.
2. Replace demo/localStorage state with authenticated API queries and mutations; provide explicit loading/error/empty states.
3. Add payment provider verification and immutable financial ledger entries; never trust client-submitted verification status.
4. Add upload validation, private storage, malware scanning strategy and download authorization.
5. Add migration versioning, cPanel installer, upgrade/rollback guidance, backup checks and install-locking.
6. Run PHP unit/integration tests, frontend tests, browser E2E tests, dependency/security scans and a clean cPanel deployment rehearsal.
7. Verify privacy, retention, auditability, performance and accessibility before release.
