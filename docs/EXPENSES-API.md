# Persistent Expenses API

This is the first server-backed iteration of the Aloms English Center expense workflow. It replaces the local-only expense record as the authoritative source only after the React module is connected and the target database has been migrated.

## Database

Apply additive migrations in filename order with the existing CLI migration runner:

- `034_persistent_expenses.sql`: bilingual expense categories and branch-scoped expense records.
- `035_expense_permissions.sql`: default role permissions, inserted without overwriting administrator customizations.

Back up the database first. Never run the SQL by copying it into a browser or public directory.

## Authenticated endpoints

All endpoints require the Laravel session and current session-version middleware.

- `GET /api/v1/expense-categories`: active categories.
- `GET /api/v1/expenses`: paginated list; optional `status`, `category_id`, `from`, `to`, `per_page`.
- `POST /api/v1/expenses`: create a pending expense.
- `PATCH /api/v1/expenses/{id}`: edit pending expenses only.
- `POST /api/v1/expenses/{id}/review`: approve or reject a pending expense.
- `POST /api/v1/expenses/{id}/mark-paid`: record payment only after approval. Non-cash payment methods require a unique external reference.
- `DELETE /api/v1/expenses/{id}`: soft-delete pending expenses only.

## Permissions and controls

- `expenses.view`: view categories and expense records.
- `expenses.manage`: create, edit and soft-delete pending records.
- `expenses.approve`: approve/reject pending records.
- `expenses.pay`: record settlement of approved records.
- Branch managers are restricted to their active assigned branch; their branch is always derived from their account, not accepted from the request.
- All writes are transactional and append audit records. Paid or reviewed records cannot be edited or deleted through these endpoints.
- The workflow uses BDT and retains the payment reference, approver, payer and timestamps.

## Remaining integration

The React Expense Manager and Reports screens still need to be connected to these endpoints. Double-entry posting to the existing general ledger, receipt/attachment uploads, export filters, and full end-to-end/browser testing are not claimed as complete by this API-only change.
