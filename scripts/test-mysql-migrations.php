<?php
declare(strict_types=1);

/**
 * Runs every SQL migration against a disposable MySQL database and verifies
 * the core schema, constraints, seed permissions, and rerun safety.
 */
$host = getenv('AEC_TEST_DB_HOST') ?: '127.0.0.1';
$port = getenv('AEC_TEST_DB_PORT') ?: '3306';
$name = getenv('AEC_TEST_DB_NAME') ?: 'aec_test';
$user = getenv('AEC_TEST_DB_USER') ?: 'root';
$pass = getenv('AEC_TEST_DB_PASS') ?: '';

$pdo = new PDO(
    "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
    $user,
    $pass,
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]
);

function assert_true(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

/** @return array{status:int,output:string} */
function run_migration_runner(array $arguments = []): array
{
    $command = array_merge([PHP_BINARY, __DIR__ . '/migrate.php'], $arguments);
    $pipes = [];
    $process = proc_open($command, [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ], $pipes, dirname(__DIR__));
    if (!is_resource($process)) throw new RuntimeException('Could not start the CLI migration runner.');
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]) ?: '';
    $stderr = stream_get_contents($pipes[2]) ?: '';
    fclose($pipes[1]);
    fclose($pipes[2]);
    return ['status' => proc_close($process), 'output' => $stdout . $stderr];
}

function run_migrations(PDO $pdo): void
{
    $files = glob(__DIR__ . '/../database/migrations/*.sql') ?: [];
    sort($files, SORT_STRING);
    assert_true(count($files) > 0, 'No SQL migration files were found.');

    foreach ($files as $file) {
        $sql = file_get_contents($file);
        assert_true($sql !== false, 'Unable to read migration: ' . basename($file));

        // Remove SQL comments before splitting statements. Migrations in this
        // repository use standalone -- comments and block comments.
        $sql = preg_replace('~/\\*.*?\\*/~s', '', $sql) ?? $sql;
        $sql = preg_replace('/^\\s*(?:--|#).*$/m', '', $sql) ?? $sql;

        foreach (explode(';', $sql) as $statement) {
            $statement = trim($statement);
            if ($statement !== '') {
                $pdo->exec($statement);
            }
        }
        echo 'PASS migration: ' . basename($file) . PHP_EOL;
    }
}

function table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (int) $stmt->fetchColumn() === 1;
}

$firstRun = run_migration_runner();
assert_true($firstRun['status'] === 0, 'CLI migration runner failed: ' . $firstRun['output']);
assert_true(str_contains($firstRun['output'], 'SUCCESS 001_core_schema.sql'), 'CLI migration runner did not apply the first migration.');
$secondRun = run_migration_runner();
assert_true($secondRun['status'] === 0 && str_contains($secondRun['output'], 'already up to date'), 'CLI migration runner was not idempotent: ' . $secondRun['output']);
$dryRun = run_migration_runner(['--dry-run']);
assert_true($dryRun['status'] === 0 && str_contains($dryRun['output'], '0 migration(s) would be applied'), 'CLI migration dry-run did not report an up-to-date database.');

$firstMigrationPath = (glob(__DIR__ . '/../database/migrations/*.sql') ?: [])[0] ?? null;
assert_true(is_string($firstMigrationPath), 'Could not locate a migration for checksum drift testing.');
$firstMigrationName = basename($firstMigrationPath);
$firstMigrationChecksum = hash_file('sha256', $firstMigrationPath);
assert_true(is_string($firstMigrationChecksum), 'Could not calculate migration checksum for drift test.');
$pdo->prepare('UPDATE aec_schema_migrations SET checksum = ? WHERE migration = ?')->execute([str_repeat('0', 64), $firstMigrationName]);
$driftRun = run_migration_runner(['--status']);
assert_true($driftRun['status'] !== 0 && str_contains($driftRun['output'], 'Checksum mismatch'), 'CLI migration runner did not reject an edited applied migration.');
$pdo->prepare('UPDATE aec_schema_migrations SET checksum = ? WHERE migration = ?')->execute([$firstMigrationChecksum, $firstMigrationName]);
echo "PASS CLI migration runner applies, skips, dry-runs and rejects checksum drift" . PHP_EOL;

// Re-run SQL directly as an additional idempotency and seed-override check.
run_migrations($pdo);

$requiredTables = [
    'aec_schema_migrations', 'users', 'role_permissions', 'login_attempts', 'course_categories',
    'courses', 'content_items', 'course_content', 'audit_logs',
    'course_enrollments', 'course_payments', 'accounting_accounts',
    'ledger_transactions', 'ledger_entries', 'payment_refunds', 'course_lesson_progress', 'exams', 'exam_questions', 'exam_attempts', 'question_bank_items', 'exam_question_bank_sources', 'attendance_records', 'site_settings', 'cms_posts', 'cms_testimonials', 'admission_applications', 'certificates', 'account_action_tokens', 'account_action_attempts', 'branches', 'notifications', 'ebook_orders', 'product_orders', 'ebook_files', 'media_assets', 'marksheets',
];

foreach ($requiredTables as $table) {
    assert_true(table_exists($pdo, $table), "Required table is missing: {$table}");
}
$sessionVersionColumn = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
$sessionVersionColumn->execute(['users', 'session_version']);
assert_true((int)$sessionVersionColumn->fetchColumn() === 1, 'User session_version column is missing.');
echo 'PASS user session revocation column' . PHP_EOL;

$branchColumns = [
    ['users', 'branch_id'],
    ['course_categories', 'branch_id'],
    ['courses', 'branch_id'],
    ['course_enrollments', 'branch_id'],
    ['course_payments', 'branch_id'],
    ['attendance_records', 'branch_id'],
    ['certificates', 'branch_id'],
    ['live_classes', 'branch_id'],
];
foreach ($branchColumns as [$table, $column]) {
    $sessionVersionColumn->execute([$table, $column]);
    assert_true((int)$sessionVersionColumn->fetchColumn() === 1, "Branch ownership column is missing: {$table}.{$column}");
}
echo 'PASS branch ownership columns and registry' . PHP_EOL;

$branchForeignKeys = [
    ['users', 'fk_users_branch'],
    ['course_categories', 'fk_categories_branch'],
    ['courses', 'fk_courses_branch'],
    ['course_enrollments', 'fk_enrollments_branch'],
    ['course_payments', 'fk_course_payments_branch'],
    ['attendance_records', 'fk_attendance_branch'],
    ['certificates', 'fk_certificates_branch'],
    ['live_classes', 'fk_live_classes_branch'],
];
$foreignKeyCheck = $pdo->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ? AND constraint_type = ?');
foreach ($branchForeignKeys as [$table, $constraint]) {
    $foreignKeyCheck->execute([$table, $constraint, 'FOREIGN KEY']);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Branch ownership foreign key is missing: {$table}.{$constraint}");
}
echo 'PASS branch ownership foreign keys' . PHP_EOL;

$notificationForeignKeys = [
    ['notifications', 'fk_notification_recipient'],
    ['notifications', 'fk_notification_sender'],
];
foreach ($notificationForeignKeys as [$table, $constraint]) {
    $foreignKeyCheck->execute([$table, $constraint, 'FOREIGN KEY']);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Notification foreign key is missing: {$table}.{$constraint}");
}

$refundForeignKeys = [
    ['payment_refunds', 'fk_payment_refund_payment'],
    ['payment_refunds', 'fk_payment_refund_processor'],
    ['ledger_transactions', 'fk_ledger_refund'],
];
foreach ($refundForeignKeys as [$table, $constraint]) {
    $foreignKeyCheck->execute([$table, $constraint, 'FOREIGN KEY']);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Refund foreign key is missing: {$table}.{$constraint}");
}
$checkConstraints = [
    ['payment_refunds', 'chk_payment_refund_positive'],
    ['ledger_transactions', 'chk_ledger_transaction_source'],
    ['ledger_entries', 'chk_ledger_entry_debit_credit'],
];
foreach ($checkConstraints as [$table, $constraint]) {
    $foreignKeyCheck->execute([$table, $constraint, 'CHECK']);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Financial check constraint is missing: {$table}.{$constraint}");
}
$paymentStatusColumn = $pdo->prepare('SELECT column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
$paymentStatusColumn->execute(['course_payments', 'status']);
assert_true(str_contains((string)$paymentStatusColumn->fetchColumn(), 'refunded'), 'Payment status enum does not include refunded.');
$ledgerPaymentNullable = $pdo->prepare('SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
$ledgerPaymentNullable->execute(['ledger_transactions', 'payment_id']);
assert_true($ledgerPaymentNullable->fetchColumn() === 'YES', 'Ledger payment_id must allow refund-only journal entries.');
echo 'PASS refund schema, ledger source constraints and payment status' . PHP_EOL;

$storefrontConstraints = [
    ['ebook_orders', 'uq_ebook_orders_trx_id', 'UNIQUE'],
    ['ebook_orders', 'fk_ebook_order_user', 'FOREIGN KEY'],
    ['ebook_orders', 'fk_ebook_order_verifier', 'FOREIGN KEY'],
    ['product_orders', 'fk_product_order_user', 'FOREIGN KEY'],
    ['product_orders', 'fk_product_order_reviewer', 'FOREIGN KEY'],
    ['ebook_orders', 'chk_ebook_order_amount_positive', 'CHECK'],
    ['product_orders', 'chk_product_order_quantity_positive', 'CHECK'],
    ['product_orders', 'chk_product_order_amount_positive', 'CHECK'],
    ['ebook_files', 'uq_ebook_files_ebook_id', 'UNIQUE'],
    ['ebook_files', 'uq_ebook_files_storage_filename', 'UNIQUE'],
    ['ebook_files', 'fk_ebook_file_uploader', 'FOREIGN KEY'],
    ['ebook_files', 'chk_ebook_file_size_positive', 'CHECK'],
    ['media_assets', 'uq_media_storage_filename', 'UNIQUE'],
    ['media_assets', 'fk_media_content', 'FOREIGN KEY'],
    ['media_assets', 'fk_media_uploader', 'FOREIGN KEY'],
    ['media_assets', 'chk_media_size', 'CHECK'],
];
foreach ($storefrontConstraints as [$table, $constraint, $type]) {
    $foreignKeyCheck->execute([$table, $constraint, $type]);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Storefront integrity constraint is missing: {$table}.{$constraint}");
}
$storefrontPermission = $pdo->prepare("SELECT allowed FROM role_permissions WHERE role = 'admin' AND permission_key = 'storefront.orders.manage'");
$storefrontPermission->execute();
assert_true((int)$storefrontPermission->fetchColumn() === 1, 'Admin storefront order permission was not seeded.');
$marksheetConstraints = [
    ['marksheets', 'uq_marksheet_number', 'UNIQUE'],
    ['marksheets', 'uq_marksheet_attempt', 'UNIQUE'],
    ['marksheets', 'fk_marksheet_attempt', 'FOREIGN KEY'],
    ['marksheets', 'fk_marksheet_exam', 'FOREIGN KEY'],
    ['marksheets', 'fk_marksheet_student', 'FOREIGN KEY'],
    ['marksheets', 'fk_marksheet_course', 'FOREIGN KEY'],
    ['marksheets', 'fk_marksheet_issuer', 'FOREIGN KEY'],
    ['marksheets', 'chk_marksheet_total_positive', 'CHECK'],
    ['marksheets', 'chk_marksheet_score_nonnegative', 'CHECK'],
    ['marksheets', 'chk_marksheet_percentage_range', 'CHECK'],
];
foreach ($marksheetConstraints as [$table, $constraint, $type]) {
    $foreignKeyCheck->execute([$table, $constraint, $type]);
    assert_true((int)$foreignKeyCheck->fetchColumn() === 1, "Marksheet integrity constraint is missing: {$table}.{$constraint}");
}
$marksheetPermission = $pdo->prepare("SELECT allowed FROM role_permissions WHERE role = 'admin' AND permission_key = 'marksheets.manage'");
$marksheetPermission->execute();
assert_true((int)$marksheetPermission->fetchColumn() === 1, 'Admin marksheet management permission was not seeded.');
$marksheetPermission->execute();
echo 'PASS persistent marksheet schema, attempt uniqueness, foreign keys and permission' . PHP_EOL;
echo 'PASS storefront order tables, constraints and admin permission' . PHP_EOL;

echo 'PASS required tables: ' . count($requiredTables) . PHP_EOL;

$expectedPermissions = [
    'courses.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'content.manage' => ['admin' => 1, 'branch_manager' => 0, 'student' => 0],
    'users.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'enrollments.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'payments.manage' => ['admin' => 1, 'branch_manager' => 1, 'accountant' => 0],
    'attendance.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'live_classes.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'notifications.broadcast' => ['admin' => 1, 'branch_manager' => 0, 'student' => 0],
    'admissions.manage' => ['admin' => 1, 'branch_manager' => 0, 'student' => 0],
    'certificates.manage' => ['admin' => 1, 'branch_manager' => 1, 'student' => 0],
    'branches.manage' => ['admin' => 1, 'branch_manager' => 0, 'student' => 0],
];

$permissionQuery = $pdo->prepare(
    'SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = ? LIMIT 1'
);
foreach ($expectedPermissions as $permission => $roles) {
    foreach ($roles as $role => $allowed) {
        $permissionQuery->execute([$role, $permission]);
        $actual = $permissionQuery->fetchColumn();
        assert_true($actual !== false && (int) $actual === $allowed, "Unexpected permission {$role}:{$permission}");
    }
}
echo 'PASS least-privilege permission seeds' . PHP_EOL;

// Verify INSERT IGNORE migrations preserve an administrator's explicit override.
$pdo->exec("UPDATE role_permissions SET allowed = 0 WHERE role = 'admin' AND permission_key = 'courses.manage'");
run_migrations($pdo);
$permissionQuery->execute(['admin', 'courses.manage']);
assert_true((int) $permissionQuery->fetchColumn() === 0, 'Migration rerun overwrote a customized permission.');
$permissionQuery->execute(['branch_manager', 'courses.manage']);
assert_true((int) $permissionQuery->fetchColumn() === 1, 'Migration rerun did not retain branch-scoped course management.');
$permissionQuery->execute(['branch_manager', 'content.manage']);
assert_true((int) $permissionQuery->fetchColumn() === 0, 'Migration rerun re-enabled unscoped branch-manager content access.');
$permissionQuery->execute(['branch_manager', 'branches.manage']);
assert_true((int) $permissionQuery->fetchColumn() === 0, 'Branch managers must not administer the global branch registry.');
echo 'PASS migration rerun preserves permission overrides and branch-scoped manager permissions' . PHP_EOL;

$examPermission = $pdo->prepare('SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = ?');
$examPermission->execute(['admin', 'exams.manage']);
assert_true((int)$examPermission->fetchColumn() === 1, 'Admin exam management permission was not seeded.');
$examPermission->execute(['branch_manager', 'exams.manage']);
assert_true((int)$examPermission->fetchColumn() === 0, 'Branch manager must not receive unscoped exam management permission.');
$examPermission->execute(['admin', 'question_bank.manage']);
assert_true((int)$examPermission->fetchColumn() === 1, 'Admin question bank permission was not seeded.');
$examPermission->execute(['branch_manager', 'question_bank.manage']);
assert_true((int)$examPermission->fetchColumn() === 0, 'Branch manager must not receive unscoped question bank permission.');
$examPermission->execute(['admin', 'attendance.manage']);
assert_true((int)$examPermission->fetchColumn() === 1, 'Admin attendance permission was not seeded.');
$examPermission->execute(['branch_manager', 'attendance.manage']);
assert_true((int)$examPermission->fetchColumn() === 1, 'Branch manager must receive attendance permission only after branch scoping is installed.');
$examPermission->execute(['admin', 'cms.manage']);
assert_true((int)$examPermission->fetchColumn() === 1, 'Admin CMS permission was not seeded.');
$examPermission->execute(['branch_manager', 'cms.manage']);
assert_true((int)$examPermission->fetchColumn() === 0, 'Branch manager must not receive unscoped CMS permission.');
echo 'PASS exam, question bank, attendance and CMS permission seeds' . PHP_EOL;

// Verify important unique constraints exist in the installed schema.
$uniqueChecks = [
    ['course_content', 'uq_course_content'],
    ['course_enrollments', 'uq_enrollment_user_course'],
    ['course_payments', 'uq_course_payment_method_trx'],
    ['ledger_transactions', 'payment_id'],
    ['course_lesson_progress', 'uq_course_lesson_progress_user_course_content'],
    ['exam_questions', 'uq_exam_question_order'],
    ['exam_question_bank_sources', 'uq_exam_question_bank_exam_item'],
    ['exam_question_bank_sources', 'uq_exam_question_bank_exam_question'],
    ['attendance_records', 'uq_attendance_course_user_date'],
    ['cms_posts', 'uq_cms_posts_slug'],
    ['admission_applications', 'uq_admission_reference_code'],
    ['account_action_tokens', 'uq_account_action_token_hash'],
];
$indexQuery = $pdo->prepare(
    'SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? AND non_unique = 0'
);
foreach ($uniqueChecks as [$table, $index]) {
    $indexQuery->execute([$table, $index]);
    assert_true((int) $indexQuery->fetchColumn() > 0, "Missing unique constraint {$table}.{$index}");
}
echo 'PASS critical unique constraints' . PHP_EOL;

echo 'All MySQL migration integration checks passed.' . PHP_EOL;
