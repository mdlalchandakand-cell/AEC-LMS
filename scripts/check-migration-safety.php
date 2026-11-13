<?php
declare(strict_types=1);

/**
 * Reject destructive table operations in migration SQL.
 *
 * SQL comments are removed before checking so explanatory comments do not
 * trigger false positives. The check is intentionally limited to executable
 * DROP TABLE and TRUNCATE TABLE statements; it does not block safe ALTERs.
 */

$directory = dirname(__DIR__) . '/database/migrations';

if (!is_dir($directory)) {
    fwrite(STDERR, "Migration directory not found: {$directory}\n");
    exit(1);
}

$files = glob($directory . '/*.sql') ?: [];
sort($files, SORT_STRING);

if ($files === []) {
    fwrite(STDERR, "No SQL migration files found.\n");
    exit(1);
}

$violations = [];

foreach ($files as $file) {
    $sql = file_get_contents($file);
    if ($sql === false) {
        $violations[] = basename($file) . ': unable to read file';
        continue;
    }

    // Remove block comments and full-line MySQL/SQL comments before scanning.
    $sql = preg_replace('~/\*.*?\*/~s', ' ', $sql) ?? $sql;
    $sql = preg_replace('/^\s*--[^\r\n]*$/m', '', $sql) ?? $sql;
    $sql = preg_replace('/^\s*\#[^\r\n]*$/m', '', $sql) ?? $sql;

    if (preg_match('/(?:^|;)\s*(?:DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i', $sql, $match) === 1) {
        $violations[] = basename($file) . ': destructive statement detected (' . trim($match[0]) . ')';
    }
}

if ($violations !== []) {
    fwrite(STDERR, "Migration safety check failed:\n - " . implode("\n - ", $violations) . "\n");
    exit(1);
}

fwrite(STDOUT, 'Migration safety check passed for ' . count($files) . " SQL migration(s).\n");
