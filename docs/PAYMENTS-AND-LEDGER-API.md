# Course payments and accounting ledger

Apply this migration after `005_course_enrollments.sql`.

- `GET /api/payments.php?action=my`: authenticated student sees only their own submissions.
- `POST /api/payments.php?action=submit`: student submits course_id, amount, method (bKash/Nagad/Bank Transfer), trx_id and optional sender_phone. Amounts are capped at the remaining course fee; duplicate method/reference pairs are rejected.
- `GET /api/payments.php?action=list&status=pending`: requires `payments.manage`.
- `POST /api/payments.php?action=verify&id=123`: requires `payments.manage`; verifies a pending payment, posts a balanced double-entry ledger transaction and activates a pending enrollment only when verified payments cover the full course fee.
- `POST /api/payments.php?action=reject&id=123`: requires `payments.manage` and a reason.
- `GET /api/payments.php?action=ledger`: requires `payments.manage`; returns the latest 500 ledger entries.

Only the `admin` role and `super_admin` bypass receive `payments.manage` initially. Branch managers and accountants are denied until branch-scoped ledger access is implemented. Ledger rows have no update/delete endpoint and payment review is one-way from pending to verified/rejected. Every verified payment posts equal debit and credit entries in one database transaction.

**Critical limitations:** this is manual payment review, not a live bKash/Nagad/bank gateway integration. Staff must independently confirm transaction references with the provider before verifying. There is no refund/reversal workflow, gateway webhook signature validation, invoice/tax handling, or production database integration test suite yet. Do not use this slice as proof of complete financial operations.
