<?php
declare(strict_types=1);

/**
 * One-time super-admin bootstrap. Run only from CLI after importing the core schema:
 * php scripts/create-admin.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("Not found\n");
}
require_once __DIR__ . '/../api/_bootstrap.php';

$db = aec_db();
$name = trim((string)readline('Administrator name: '));
$email = strtolower(trim((string)readline('Administrator email: ')));
echo "Administrator password (input is hidden only when your terminal supports stty): ";
$hidden = function_exists('shell_exec') && DIRECTORY_SEPARATOR === '/';
if ($hidden) {
    shell_exec('stty -echo');
    $password = (string)fgets(STDIN);
    shell_exec('stty echo');
    echo PHP_EOL;
} else {
    $password = (string)fgets(STDIN);
}
$password = trim($password);

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Name, valid email, and password of at least 12 characters are required.\n");
    exit(1);
}
$check = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$check->execute([$email]);
if ($check->fetch()) {
    fwrite(STDERR, "An account with that email already exists. No changes made.\n");
    exit(1);
}
$stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, 'super_admin', 1, NOW())");
$stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
fwrite(STDOUT, "Super administrator created. Delete this script from the hosting account after use.\n");
