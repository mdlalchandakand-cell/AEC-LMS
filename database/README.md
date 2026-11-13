# Database setup

1. Create an empty MySQL/MariaDB database and a dedicated database user in cPanel.
2. Grant that user privileges only on the LMS database.
3. Import every SQL file in `migrations/` using phpMyAdmin, in numeric filename order (001, 002, 003, ...).
4. Set the server environment variables documented in `api/README.md`.
5. Create the first super administrator using the one-time CLI script once it is added. Do not insert a plain-text password or expose an open public admin-registration endpoint.

Migrations are additive and intentionally contain no destructive DROP statements. Back up the database before every future migration.
