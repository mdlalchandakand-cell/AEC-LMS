# Commercial release blockers — Aloms English Center LMS

Last reviewed: 2026-11-13

## Release policy

Do not distribute or install a generated cPanel or CodeCanyon ZIP until it is built from the current React/Vite frontend, the checked-in PHP 8.3 API, and the additive MySQL migrations in `database/migrations/`. The legacy package generator contains a separate, older PHP application and a destructive sample schema. Its download path is intentionally disabled. It must be replaced, not treated as the current application installer.

## Required release gates

- [ ] Persistent teacher-course assignment, commission accrual, payout requests, approvals, and immutable payout audit trail.
- [ ] Guardian-to-student relationship management with verified consent, branch scoping, and read-only progress, attendance, result, and payment views.
- [ ] Persistent batches and weekly routines with collision checks, capacity rules, and branch-scoped permissions.
- [ ] Persistent recycle bin with soft-delete, restore, permanent-delete policy, retention, and audit logging.
- [ ] API-backed expenses and financial/academic reports with date, branch, role, and export controls.
- [ ] Subscription plans, renewals, expiry handling, invoices, and payment-provider adapters.
- [ ] Provider-specific payment callbacks, signature verification, idempotency, reconciliation, and refund workflows. Manual verification must remain clearly distinct from an automated gateway.
- [ ] Server-side plugin configuration and secret storage; never store provider secrets in browser localStorage or bundle output.
- [ ] Production email/SMS delivery with provider configuration, retry policy, and delivery logs.
- [ ] Complete branch isolation for every tenant-owned API and query.
- [ ] Private course media upload/download with MIME validation, authorization, and storage outside the public web root.
- [ ] Installer that uses the existing additive migrations; never executes destructive `DROP TABLE` schema templates against an existing database.
- [ ] Installation lock, safe configuration writing, upgrade checks, backup/restore, rollback, and cPanel File Manager-only workflow.
- [ ] Browser E2E, API integration, migration, security, accessibility, and performance checks.
- [ ] Clean cPanel deployment rehearsal using the exact release ZIP and PHP 8.3+/supported MySQL or MariaDB.
- [ ] Live-class provider configuration and measured 300+ participant load/capacity validation; do not infer capacity from meeting-link storage.
- [ ] Android application source, build, signing, API compatibility, and release validation if mobile app delivery remains in scope.
- [ ] CodeCanyon package structure, complete user/admin documentation, valid reviewer demo accounts generated securely, and real Envato license verification if the product implements buyer licensing.

## Known trust and security fixes

- Browser-side Envato purchase-code format checks are not license verification. The UI now reports verification as unavailable until a trusted server-side integration is configured.
- Fabricated analytics IDs, verification tokens, and reviewer demo passwords must not ship as connected integrations or valid test accounts.
- Package download controls remain disabled while the legacy package generator is blocked.
- No production credentials should be committed to Git or stored in frontend state.

A checklist item is complete only when the implementation, permission boundaries, automated tests, and deployment behavior have all been verified. A UI screen or a successful frontend build is not evidence of a complete workflow.
