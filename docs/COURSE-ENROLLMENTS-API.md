# Course enrollment API

Apply migrations in numeric order through `004_user_management_permissions.sql`, then `005_course_enrollments.sql`.

- `GET /api/enrollments.php?action=my`: authenticated user can see only their own enrollments.
- `GET /api/enrollments.php?action=list&limit=100&status=pending`: requires `enrollments.manage`.
- `POST /api/enrollments.php?action=create`: requires `enrollments.manage`; accepts `user_id`, `course_id`, optional `status` (defaults to pending), `branch_id`, and `notes`.
- `POST /api/enrollments.php?action=update&id=123`: requires `enrollments.manage`; accepts status, starts_at, ends_at, and notes.

Only active student accounts and published courses can be enrolled. A unique user/course constraint prevents duplicate enrollment records. Existing enrollments are reactivated by updating their status, not by creating duplicate rows. Mutations are audit logged. Students cannot list other students' enrollments or activate their own access.

**Important boundary:** This is manual enrollment management, not payment processing. A privileged administrator can explicitly create an active enrollment; this endpoint does not verify bKash/Nagad/bank/cash payments. Branch-manager access is disabled until row-level branch scoping is implemented. The endpoint does not yet provide public registration, payment-gated enrollment, refunds, or enrollment UI.
