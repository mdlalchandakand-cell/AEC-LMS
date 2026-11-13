# User management API

All endpoints require an authenticated session and the `users.manage` permission. State-changing requests also require the CSRF token returned by login or `GET /api/auth.php?action=me`.

- `GET /api/users.php?action=list&limit=50&q=` — list users without password hashes.
- `POST /api/users.php?action=create` — create a user with name, email, password (minimum 12 characters), role, and optional phone/branch_id.
- `POST /api/users.php?action=update&id=123` — update supplied profile fields; a password change must be at least 12 characters.
- `POST /api/users.php?action=deactivate&id=123` — deactivate an account without deleting its records.

The first release grants `users.manage` only to the `admin` role (plus the existing super-admin permission bypass). Branch managers and other roles are denied by default until branch-scoped authorization is implemented and tested. Non-super-admin administrators cannot create or promote administrators, and cannot modify/deactivate super-admin accounts. Users cannot change their own role or deactivate themselves. Every mutation is written to `audit_logs`.

This API slice does not yet provide public self-registration, email verification, password reset, role-permission editing, branch creation, or branch-scoped user filtering.
