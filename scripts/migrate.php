<?php
declare(strict_types=1);

/**
 * CLI-only, checksum-aware MySQL migration runner for cPanel and other hosts.
 *
 * Usage:
 *   php scripts/migrate.php
 *   php scripts/migrate.php --status
 *   php scripts/migrate.php --dry-run
 *
 * Configure AEC_DB_HOST, AEC_DB_NAME, AEC_DB_USER and AEC_DB_PASS in the
 * server environment. AEC_DB_PORT is optional and defaults to 3306.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$args = array_slice($argv, 1);
$allowedArgs = ['--status', '--dry-run', '--help'];
foreach ($args as $arg) {
    if (!in_array($arg, $allowedArgs, true)) {
        fwrite(STDERR, "Unknown option: {$arg}\n");
        exit(2);
    }
}
if (in_array('--help', $args, true)) {
    echo "Usage: php scripts/migrate.php [--status|--dry-run|--help]\n";
    exit(0);
}
if (count(array_intersect($args, ['--status', '--dry-run'])) > 1) {
    fwrite(STDERR, "Choose either --status or --dry-run, not both.\n");
    exit(2);
}

function migration_env(string $key, ?string $fallback = null): ?string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $fallback : $value;
}

$host = migration_env('AEC_DB_HOST', migration_env('AEC_TEST_DB_HOST'));
$name = migration_env('AEC_DB_NAME', migration_env('AEC_TEST_DB_NAME'));
$user = migration_env('AEC_DB_USER', migration_env('AEC_TEST_DB_USER'));
$pass = migration_env('AEC_DB_PASS', migration_env('AEC_TEST_DB_PASS', ''));
$port = migration_env('AEC_DB_PORT', migration_env('AEC_TEST_DB_PORT', '3306'));

if (!$host || !$name || !$user) {
    fwrite(STDERR, "Database is not configured. Set AEC_DB_HOST, AEC_DB_NAME, AEC_DB_USER and AEC_DB_PASS.\n");
    exit(1);
}
if (!ctype_digit((string)$port) || (int)$port < 1 || (int)$port > 65535) {
    fwrite(STDERR, "AEC_DB_PORT must be a valid TCP port.\n");
    exit(1);
}

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
        $user,
        $pass ?? '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $error) {
    fwrite(STDERR, "Could not connect to the configured MySQL database: {$error->getMessage()}\n");
    exit(1);
}

$lockName = 'aec_lms_schema_migrations';
$lockAcquired = false;

try {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS aec_schema_migrations (
            migration VARCHAR(255) NOT NULL PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $lock = $pdo->prepare('SELECT GET_LOCK(?, 30)');
    $lock->execute([$lockName]);
    $lockAcquired = (int)$lock->fetchColumn() === 1;
    if (!$lockAcquired) {
        throw new RuntimeException('Could not acquire the database migration lock within 30 seconds.');
    }

    $migrationDirectory = __DIR__ . '/../database/migrations';
    $files = glob($migrationDirectory . '/*.sql') ?: [];
    sort($files, SORT_STRING);
    if (!$files) throw new RuntimeException('No SQL migration files were found.');

    $appliedRows = $pdo->query('SELECT migration, checksum, applied_at FROM aec_schema_migrations')->fetchAll();
    $applied = [];
    foreach ($appliedRows as $row) $applied[$row['migration']] = $row;

    $knownFiles = [];
    $pending = [];
    foreach ($files as $file) {
        $filename = basename($file);
        $knownFiles[$filename] = true;
        $checksum = hash_file('sha256', $file);
        if (!is_string($checksum)) throw new RuntimeException("Could not calculate checksum for {$filename}.");

        if (isset($applied[$filename])) {
            if (!hash_equals((string)$applied[$filename]['checksum'], $checksum)) {
                throw new RuntimeException("Checksum mismatch for {$filename}. Applied migrations are immutable; create a new migration instead of editing this file.");
            }
            echo "APPLIED {$filename} ({$applied[$filename]['applied_at']})\n";
            continue;
        }
        $pending[] = ['path' => $file, 'name' => $filename, 'checksum' => $checksum];
        echo "PENDING {$filename}\n";
    }

    foreach (array_keys($applied) as $filename) {
        if (!isset($knownFiles[$filename])) {
            throw new RuntimeException("Applied migration file is missing from the repository: {$filename}.");
        }
    }

    if (in_array('--status', $args, true)) {
        echo count($pending) . " pending migration(s).\n";
        exit(0);
    }
    if (in_array('--dry-run', $args, true)) {
        echo "Dry run only; no migrations were changed. " . count($pending) . " migration(s) would be applied.\n";
        exit(0);
    }

    foreach ($pending as $migration) {
        $sql = file_get_contents($migration['path']);
        if (!is_string($sql)) throw new RuntimeException("Could not read {$migration['name']}.");

        // Current migrations contain ordinary DDL/DML only; remove standalone
        // SQL comments before splitting into statements.
        $sql = preg_replace('~/\*.*?\*/~s', '', $sql) ?? $sql;
        $sql = preg_replace('/^\s*(?:--|#).*$/m', '', $sql) ?? $sql;

        foreach (explode(';', $sql) as $statement) {
            $statement = trim($statement);
            if ($statement !== '') $pdo->exec($statement);
        }

        $record = $pdo->prepare('INSERT INTO aec_schema_migrations (migration, checksum) VALUES (?, ?)');
        $record->execute([$migration['name'], $migration['checksum']]);
        echo "SUCCESS {$migration['name']}\n";
    }

    echo count($pending) === 0
        ? "Database schema is already up to date.\n"
        : "Successfully applied " . count($pending) . " migration(s).\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Migration runner failed: {$error->getMessage()}\n");
    exit(1);
} finally {
    if ($lockAcquired) {
        try {
            $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
            $release->execute([$lockName]);
        } catch (Throwable $ignored) {
            // Preserve the original migration result.
        }
    }
}
