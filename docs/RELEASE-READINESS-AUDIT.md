# Alom's English Center LMS — Release Readiness Audit

Audit date: 2026-11-13  
Repository: `Alomsenglishcenter/Aloms-Lms`  
Target runtime: PHP 8.3+, MySQL 8 / compatible MariaDB, React/Vite, cPanel

## Executive result

**Not production-ready yet.** The repository has a working backend foundation and several real API-connected workflows, but multiple dashboard areas still use browser-local demo data or have no corresponding PHP endpoint. A successful frontend build and the current MySQL/API integration suite do not prove the entire LMS is complete.

Do not distribute the existing ZIP as a final production package until all release gates below are closed and a clean cPanel deployment rehearsal succeeds.

## Verified implementation

The following components exist in the repository and have automated checks:

- PHP session login, session restore/logout, password change, CSRF token checks, login throttling and role-permission checks.
- Course categories, course CRUD, soft-delete/restore, published/draft visibility and reusable content items.
- Many-to-many course/content links, including atomic bulk link synchronization and per-course preview flags.
- Enrollment API and management screen.
- Manual bKash/Nagad/bank-transfer payment submission and review, double-entry payment ledger, provider-confirmed partial/full refund recording, balanced reversal journals, ledger reconciliation and course-access recalculation.
- User-management API, API-backed user-management screen and API-backed Student Directory with safe account deactivation (PR #34).
- Public admission inquiry intake with validation/rate limiting, admin-only review and audit logging (PR #35); it does not create student accounts, enrollments or payment confirmations.
- Certificate issuance, student wallet, public verification and audited revocation with enrollment/completion checks (PR #38).
- Branch registry and server-side branch isolation are implemented for users, courses, categories, enrollments, payments, attendance, certificates and live classes (migration 017). Branch managers cannot manage the global branch registry or shared content library; branch-scoped permissions are enabled only for the resources with API-level scope checks.
- Timed MCQ exam engine with API-backed management, student portal, autosaved/resumable attempts, maximum attempts, exam windows and server-side grading (merged in PR #24).
- Live-class schedule, status lifecycle and recording links are API-backed and merged in PR #43.
- Public homepage, learning, instructor, product, e-book and exam pages are integrated into application routing; the course catalog manager now uses persistent course, category, lesson and exam APIs.
- Storefront order foundation: migrations 020–021, server-priced cash-on-delivery product orders, manually verified premium e-book payment requests, student entitlements, admin review/fulfilment dashboard, private PDF uploads (20 MB PDF signature/MIME checks), opaque filenames, SHA-256 metadata, Apache direct-access denial and entitlement-checked download route. This work was merged in PR #47; main CI passed on merge commit `1ebf4cb`. Manual payment verification remains.
- Course, category, content, enrollment, payment, exam and migration HTTP/schema integration tests.
- Frontend type-check and production build in GitHub Actions.

Classroom content integration and persistent lesson progress were merged in PR #19. The timed exam engine and reusable question bank were merged in PRs #24 and #28; exam concurrency/access hardening was merged in PR #27. Persistent attendance was merged in PR #30. Website settings, CMS posts and testimonials are persisted through MySQL after PR #31; student directory integration was updated in PR #34; the public admission form now stores reviewable inquiries in PR #35; certificate issuance and verification are API-backed after PR #38. The CLI migration runner, Apache SPA/security rules and cPanel deployment guide are included in PR #40; they do not replace a full installer or a clean deployment rehearsal. Browser E2E and deployment rehearsal remain. These changes do not close the remaining LMS release gates.

## Gaps found in the repository

### Backend endpoints not yet present

There are no production API endpoints yet for reporting, teacher commissions/payouts, library, hostel/transport or batch/routine management. Branch registry, branch-owned categories and scoped branch ownership APIs were added in migration 017. Persistent live-class scheduling and lifecycle actions were merged in PR #43. CMS/blog and persistent website settings are API-backed after PR #31; certificate routes are available after PR #38.

### Dashboard areas still using local/demo state

The current `LmsContext.tsx` still initializes legacy/demo records in browser `localStorage`, including lessons, live classes, exam/demo records, payments, attendance, legacy certificate seed records, expenses, tenants, batches, routines, question bank, marksheets, commissions, payout requests, marketing settings and recycle-bin records. The admin and student certificate screens use the persistent PHP API in PR #38 rather than these legacy certificate seeds. Active classroom, exam, question-bank and attendance workflows use the PHP API; CMS settings/posts/testimonials are API-backed after PR #31.

The following visible modules still depend substantially on context/demo state rather than a complete persistent backend workflow:

- Attendance legacy context data remains, but the active attendance register and student history are API-backed after PR #30.
- Legacy exam/demo records remain in `LmsContext`; active exam management, portal and simulator are API-backed after PR #24; browser E2E testing remains.
- Certificate issuance, student wallet, public verification and audited revocation are merged in PR #38; PHP/MySQL integration and frontend CI passed. Browser E2E and cPanel deployment rehearsal remain release gates.
- CMS posts, testimonials and website settings are API-backed after PR #31; browser E2E remains.
- Public admission form and admin inquiry review are API-backed after PR #35; self-service registration, email verification, account creation, enrollment conversion and payment confirmation are not part of this intake flow.
- Batches and routines remain demo/local state; live-class API and dashboard integration are merged in PR #43; branch management and scoped APIs are implemented in migration 017
- Legacy question-bank fixtures remain in context; active question-bank management is API-backed after PR #28. Persistent marksheet issuance and the admin/student registry UI are implemented on `feature/persistent-marksheet-backend`, but require successful MySQL/HTTP integration and frontend build validation before release.
- Expenses, reports, teacher commissions and payouts remain incomplete; persistent in-app notifications are API-backed, while email/SMS delivery remains incomplete
- Library, hostel, transport and SaaS administration

The legacy `PaymentManager` also remains in the codebase; the active payment routes should continue to use the API-backed `PaymentApiPanel`, not the local-state payment workflow. Product orders now use a persisted cash-on-delivery queue merged in PR #47; premium e-book payment references are not unlocked until admin verification. The public learning and storefront pages now include private PDF upload and entitlement-checked streaming merged in PR #47; actual e-book PDF assets must still be uploaded and browser E2E validation remains. Google sign-in remains intentionally disabled until real OAuth token verification is implemented. No generative-AI runtime dependency is required for these LMS workflows; the functionality runs through the LMS application and its own APIs.

### Security and operations still required

- Branch-scoped authorization is implemented for users, courses, categories, enrollments, payments, attendance, certificates and live classes. Branch managers remain denied global content, exam, question-bank, CMS and report management until those APIs are branch-scoped.
- Self-service student registration, email verification/resend, password reset/account recovery and self-profile management were merged and CI-validated in PR #42; production email delivery still requires a cPanel smoke test. Optional MFA is not implemented. The public admission form still records an inquiry only; it does not create an account.
- Production media uploads outside the public web path are implemented for e-book PDFs in merged PR #47 (migration 021). A general private course-media library (migration 022, MIME allowlist, 20 MB limit, randomized storage names, SHA-256 metadata, authenticated/enrollment-aware downloads and integration coverage) is proposed in PR #50; it remains unvalidated until CI executes and cPanel filesystem/HTTP-denial smoke tests pass.
- Live payment-provider callback/signature verification and automated provider refunds; cash desk, receipts and invoices; stronger immutable-ledger enforcement and external bank/provider reconciliation. Manual provider-confirmed refunds and balanced reversal journals are implemented in PR #45.
- Database-level ledger immutability controls and reconciliation.
- Full installer/deployment wizard, installation lock, backup/restore and rollback plan. A checksum-aware CLI migration runner and Apache access-control rules are implemented in PR #40, but they do not replace the full installer or rollback process.
- Browser end-to-end tests, accessibility checks, performance checks, dependency/security scans and production error logging.
- A fresh cPanel deployment rehearsal using the exact final ZIP.

## Current follow-up

- Public Learn page backend integration is in PR #49: it loads published standalone and preview-linked lessons from the public content API instead of localStorage demo data. The PR's GitHub Actions jobs currently fail before producing steps or downloadable logs, so its CI cause is unverified and it is not merged.

## Release gates

| Gate | Status |
|---|---|
| PHP 8.3 / MySQL backend foundation | Partial — core endpoints exist |
| Authentication, CSRF and basic RBAC | Partial — student registration/recovery/profile code merged and CI-validated in PR #42; production mail delivery remains a deployment smoke-test gate; branch isolation missing; unscoped branch-manager management disabled |
| Courses, categories and reusable content | Implemented foundation; further UI/security tests required |
| Enrollments | API and management screen exist; broader lifecycle/branch rules required |
| Payments and accounting | Manual verification, provider-confirmed refunds, balanced reversal journals and API reconciliation implemented in PR #45; live gateway callbacks, automated provider refunds, cash desk, receipts/invoices and external reconciliation remain |
| Classroom content and student progress | Merged in PR #19; PHP/MySQL integration tests pass |
| Exams and question bank | Timed exam engine and reusable question bank merged in PRs #24/#28; exam concurrency/access hardening merged in PR #27; browser E2E tests remain |
| Attendance | API, migration, admin register and student history merged in PR #30; browser E2E and branch scoping remain |
| Certificates | Persistent issue/list/student-wallet/verify/revoke API and frontend merged in PR #38; PHP/MySQL integration tests pass |
| CMS, SEO and website settings | API, persistent settings, blog and testimonials merged in PR #31; browser E2E remains |
| Student Directory | MySQL-backed user list and safe deactivation merged in PR #34; student admission conversion and branch-scoped user access remain |
| Admission intake | Public inquiry, rate limiting, admin review and audit trail merged in PR #35; self-service registration and payment/enrollment conversion remain |
| Live classes | Persistent API and dashboard integration merged in PR #43; CI passed |
| Branch management and data isolation | Branch registry and API scoping for users, courses, categories, enrollments, payments, attendance, certificates and live classes merged/implemented; remaining modules still restricted |
| Notifications | Persistent API-backed in-app inbox, role-targeted admin broadcasts and read/delete lifecycle implemented; email/SMS delivery remains incomplete |
| Public website and catalog | Homepage, exams, instructors, products, e-books and admin catalog/order UI merged in PR #47; public Learn lesson loading is in PR #49 and blocked by unavailable CI logs; browser E2E and final design review remain |
| Storefront orders | Migrations 020–021, API, catalog editor, admin queue, private PDF upload and entitlement-checked downloads merged in PR #47; manual e-book payment verification only, no automated gateway callbacks |
| Reports and other operations | Demo/local state or incomplete |
| Installer and cPanel package | CLI migration runner, Apache SPA/access-control rules and cPanel guide are implemented in PR #40; full installer, backup/restore and clean deployment rehearsal remain |
| Full security, E2E and deployment rehearsal | Not complete |

## Audit method

This review inspected the GitHub repository tree, PHP API endpoints, SQL migrations, API client, application routing, LMS context persistence, and the connected dashboard modules. Automated CI results were checked separately. Items not backed by an endpoint, migration, or test are deliberately marked incomplete rather than assumed to work.

- The Question Bank and timed Exam engine use PHP/MySQL APIs. The persistent marksheet branch adds a permission-checked API and migration with immutable student/exam/score snapshots, derives grade and score only from submitted server-scored attempts, enforces one marksheet per attempt, and replaces the manual localStorage generator with an API-backed issuance queue, registry and print view. Student/admin access, forged client score fields and duplicate issuance now have integration assertions, but these checks are not verified until the hosted runner executes the PHP/MySQL suite and frontend build successfully.
- No production installer or backup/restore workflow is present in the repository tree at this audit point. A clean cPanel install, migration bootstrap, backup creation, integrity check and restore rehearsal remain release blockers.

## Additional branch-scope release gate

- Student examination visibility, detail access and attempt start now also check that a linked course's branch is active (PR #52). Admin/exam managers retain access for administration. The new integration assertions still require a real MySQL/HTTP run before this control is considered verified.
