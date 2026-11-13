<?php
declare(strict_types=1);

/** Disposable-MySQL HTTP integration tests for public student account lifecycle. */
$root = dirname(__DIR__);
$host = getenv('AEC_TEST_DB_HOST') ?: '127.0.0.1';
$port = getenv('AEC_TEST_DB_PORT') ?: '3306';
$name = getenv('AEC_TEST_DB_NAME') ?: 'aec_test';
$user = getenv('AEC_TEST_DB_USER') ?: 'root';
$pass = getenv('AEC_TEST_DB_PASS') ?: '';
$db = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
function account_check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
}
function account_request(string $base, string $path, string $method = 'GET', ?array $payload = null, ?string &$cookie = null, ?string $csrf = null): array {
    $headers = ['Accept: application/json'];
    if ($payload !== null) $headers[] = 'Content-Type: application/json';
    if ($cookie) $headers[] = 'Cookie: ' . $cookie;
    if ($csrf) $headers[] = 'X-CSRF-Token: ' . $csrf;
    $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $payload === null ? '' : json_encode($payload), 'ignore_errors' => true, 'timeout' => 10]]);
    $raw = file_get_contents($base . $path, false, $ctx);
    $status = 0;
    foreach (($http_response_header ?? []) as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $m)) $status = (int)$m[1];
        if (stripos($header, 'Set-Cookie: AEC_LMS_SESSION=') === 0) $cookie = trim(explode(';', substr($header, strlen('Set-Cookie:')), 2)[0]);
    }
    return ['status' => $status, 'body' => is_string($raw) ? (json_decode($raw, true) ?: []) : []];
}
function account_expect(array $response, int $status, string $label): array {
    account_check($response['status'] === $status, "{$label}: expected {$status}, got {$response['status']} " . json_encode($response['body']));
    echo "PASS {$label} (HTTP {$status})" . PHP_EOL;
    return $response['body'];
}
$mailLog = tempnam(sys_get_temp_dir(), 'aec-account-mail-');
account_check(is_string($mailLog), 'Could not create temporary mail capture file.');
$socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
account_check($socket !== false, 'Could not reserve a local port: ' . $error);
$address = stream_socket_get_name($socket, false);
fclose($socket);
$portNumber = (int)substr(strrchr((string)$address, ':'), 1);
$base = "http://127.0.0.1:{$portNumber}";
$descriptors = [0 => ['pipe', 'r'], 1 => ['file', '/dev/null', 'a'], 2 => ['file', '/dev/null', 'a']];
$env = array_merge(getenv(), ['AEC_ENV' => 'testing', 'AEC_TEST_MAIL_LOG' => $mailLog, 'AEC_MAIL_FROM' => 'no-reply@example.test', 'AEC_APP_URL' => 'https://example.test']);
$server = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$portNumber}", '-t', $root], $descriptors, $pipes, $root, $env);
account_check(is_resource($server), 'Could not start PHP API server.');
$cookie = null;
$csrf = null;
$studentId = null;
$adminId = null;
$unverifiedId = null;
$email = null;
$newEmail = null;
$adminEmail = null;
$unverifiedEmail = null;
try {
    $ready = false;
    for ($i = 0; $i < 40; $i++) {
        $probe = @file_get_contents($base . '/api/auth.php?action=me', false, stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 1]]));
        if ($probe !== false) { $ready = true; break; }
        usleep(250000);
    }
    account_check($ready, 'PHP API server did not become ready.');
    $suffix = bin2hex(random_bytes(6));
    $email = "student-account-{$suffix}@example.test";
    $password = 'StudentAccount!Pass123';
    account_expect(account_request($base, '/api/accounts.php?action=register', 'POST', ['name' => 'Account Lifecycle Student', 'email' => $email, 'phone' => '+8801700000099', 'password' => 'weak'], $cookie), 422, 'Weak registration password rejected');
    $registration = account_expect(account_request($base, '/api/accounts.php?action=register', 'POST', ['name' => 'Account Lifecycle Student', 'email' => $email, 'phone' => '+8801700000099', 'password' => $password], $cookie), 201, 'Public registration creates a pending student');
    account_check(($registration['data']['email'] ?? '') === $email, 'Registration response email mismatch.');
    $userQuery = $db->prepare('SELECT id, role, is_active, email_verified_at, password_hash FROM users WHERE email = ?');
    $userQuery->execute([$email]);
    $student = $userQuery->fetch();
    $studentId = $student ? (int)$student['id'] : null;
    account_check($student && $student['role'] === 'student' && (int)$student['is_active'] === 0 && $student['email_verified_at'] === null, 'New student must remain inactive until email verification.');
    account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $email, 'password' => $password], $cookie), 401, 'Unverified student cannot sign in');
    account_expect(account_request($base, '/api/accounts.php?action=register', 'POST', ['name' => 'Duplicate', 'email' => $email, 'password' => $password], $cookie), 409, 'Duplicate registration is rejected');
    account_expect(account_request($base, '/api/accounts.php?action=resend_verification', 'POST', ['email' => $email], $cookie), 200, 'Verification resend uses a generic response');
    $mails = array_map(static fn($line) => json_decode($line, true), file($mailLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);
    account_check(count($mails) === 2 && ($mails[0]['email'] ?? '') === $email && ($mails[1]['email'] ?? '') === $email, 'Verification email or resend was not captured.');
    account_check(str_starts_with((string)($mails[0]['url'] ?? ''), 'https://example.test/'), 'Verification link did not use the configured trusted application URL.');
    account_check(!str_contains((string)($mails[0]['body'] ?? ''), '&amp;'), 'Plain-text verification email incorrectly HTML-escaped URL query separators.');
    parse_str((string)parse_url($mails[0]['url'], PHP_URL_QUERY), $oldVerifyQuery);
    $oldVerifyToken = (string)($oldVerifyQuery['token'] ?? '');
    parse_str((string)parse_url($mails[1]['url'], PHP_URL_QUERY), $verifyQuery);
    $verifyToken = (string)($verifyQuery['token'] ?? '');
    account_expect(account_request($base, '/api/accounts.php?action=verify_email', 'POST', ['token' => $oldVerifyToken], $cookie), 422, 'Resending verification invalidates the previous token');
    account_check((bool)preg_match('/^[a-f0-9]{64}$/', $verifyToken), 'Verification token format is invalid.');
    $tokenRow = $db->prepare('SELECT COUNT(*) FROM account_action_tokens WHERE user_id = ? AND purpose = ? AND token_hash = ?');
    $tokenRow->execute([(int)$student['id'], 'verify_email', hash('sha256', $verifyToken)]);
    account_check((int)$tokenRow->fetchColumn() === 1, 'Only the current verification token hash should be stored.');
    account_expect(account_request($base, '/api/accounts.php?action=verify_email', 'POST', ['token' => $verifyToken], $cookie), 200, 'Email verification activates account');
    account_expect(account_request($base, '/api/accounts.php?action=verify_email', 'POST', ['token' => $verifyToken], $cookie), 422, 'Verification token is single-use');
    $userQuery->execute([$email]);
    $verified = $userQuery->fetch();
    account_check((int)$verified['is_active'] === 1 && $verified['email_verified_at'] !== null, 'Verified account was not activated.');
    $auditQuery = $db->prepare("SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'user' AND entity_id = ? AND action IN ('user.registered', 'user.email_verified')");
    $auditQuery->execute([(int)$student['id']]);
    account_check((int)$auditQuery->fetchColumn() === 2, 'Registration and email verification audit events were not recorded.');
    $login = account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $email, 'password' => $password], $cookie), 200, 'Verified student can sign in');
    $csrf = $login['data']['csrf_token'] ?? null;
    account_check(is_string($csrf) && strlen($csrf) >= 32, 'Student login did not return CSRF token.');
    $profile = account_expect(account_request($base, '/api/accounts.php?action=profile', 'GET', null, $cookie), 200, 'Student reads own profile');
    account_check((int)($profile['data']['id'] ?? 0) === (int)$student['id'], 'Profile endpoint returned wrong owner.');
    account_check(!empty($profile['data']['email_verified_at']), 'Profile endpoint omitted the verified email timestamp.');
    account_expect(account_request($base, '/api/accounts.php?action=profile', 'POST', ['name' => 'Updated Account Student', 'phone' => '+8801700000088'], $cookie), 419, 'Profile update rejects missing CSRF');
    account_expect(account_request($base, '/api/accounts.php?action=profile', 'POST', ['name' => 'Updated Account Student', 'phone' => '+8801700000088'], $cookie, $csrf), 200, 'Student updates own profile with CSRF');
    $newEmail = "unknown-{$suffix}@example.test";
    $adminEmail = "account-admin-{$suffix}@example.test";
    $adminPassword = 'AccountAdmin!Pass123';
    $db->prepare('INSERT INTO users (name, email, password_hash, role, is_active, email_verified_at) VALUES (?, ?, ?, ?, 1, NOW())')
        ->execute(['Account Lifecycle Admin', $adminEmail, password_hash($adminPassword, PASSWORD_DEFAULT), 'admin']);
    $adminId = (int)$db->lastInsertId();
    $adminCookie = null;
    $adminLogin = account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $adminCookie), 200, 'Administrator login for account activation');
    $adminCsrf = $adminLogin['data']['csrf_token'] ?? null;
    account_expect(account_request($base, '/api/accounts.php?action=admin_activate&id=' . (int)$student['id'], 'POST', [], $cookie, $csrf), 403, 'Student cannot activate another account');
    $db->prepare('UPDATE users SET is_active = 0 WHERE id = ?')->execute([(int)$student['id']]);
    account_expect(account_request($base, '/api/accounts.php?action=admin_activate&id=' . (int)$student['id'], 'POST', [], $adminCookie, $adminCsrf), 200, 'Administrator reactivates a verified student with audit trail');
    $unverifiedEmail = "unverified-{$suffix}@example.test";
    $db->prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Unverified Student', ?, ?, 'student', 0)")
        ->execute([$unverifiedEmail, password_hash($password, PASSWORD_DEFAULT)]);
    $unverifiedId = (int)$db->lastInsertId();
    account_expect(account_request($base, '/api/accounts.php?action=admin_activate&id=' . $unverifiedId, 'POST', [], $adminCookie, $adminCsrf), 409, 'Administrator cannot bypass student email verification');
    $renewedLogin = account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $email, 'password' => $password], $cookie), 200, 'Student can sign in after audited account reactivation');
    $csrf = $renewedLogin['data']['csrf_token'] ?? $csrf;
    $unknownReset = account_expect(account_request($base, '/api/accounts.php?action=request_password_reset', 'POST', ['email' => $newEmail], $cookie), 200, 'Unknown account reset request receives generic response');
    $knownReset = account_expect(account_request($base, '/api/accounts.php?action=request_password_reset', 'POST', ['email' => $email], $cookie), 200, 'Known student reset request receives generic response');
    account_check(($unknownReset['message'] ?? '') === ($knownReset['message'] ?? ''), 'Password reset response leaks account existence.');
    $mails = array_map(static fn($line) => json_decode($line, true), file($mailLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);
    account_check(count($mails) === 3 && ($mails[2]['email'] ?? '') === $email, 'Password reset email was not captured or unknown account leaked a message.');
    parse_str((string)parse_url($mails[2]['url'], PHP_URL_QUERY), $resetQuery);
    $resetToken = (string)($resetQuery['token'] ?? '');
    account_expect(account_request($base, '/api/accounts.php?action=reset_password', 'POST', ['token' => $resetToken, 'password' => 'weak'], $cookie), 422, 'Weak reset password rejected');
    account_expect(account_request($base, '/api/accounts.php?action=reset_password', 'POST', ['token' => $resetToken, 'password' => 'NewStudentPassword!456'], $cookie), 200, 'Student password reset succeeds');
    $auditReset = $db->prepare("SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'user' AND entity_id = ? AND action = 'user.password_reset'");
    $auditReset->execute([(int)$student['id']]);
    account_check((int)$auditReset->fetchColumn() === 1, 'Password reset audit event was not recorded.');
    account_expect(account_request($base, '/api/auth.php?action=me', 'GET', null, $cookie), 401, 'Password reset revokes existing authenticated sessions');
    account_expect(account_request($base, '/api/accounts.php?action=reset_password', 'POST', ['token' => $resetToken, 'password' => 'AnotherStudentPassword!789'], $cookie), 422, 'Password reset token is single-use');
    $oldLogin = null;
    account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $email, 'password' => $password], $oldLogin), 401, 'Old password stops working after reset');
    $newLogin = null;
    account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $email, 'password' => 'NewStudentPassword!456'], $newLogin), 200, 'New password works after reset');
    $changedEmail = "changed-email-{$suffix}@example.test";
    account_expect(account_request($base, '/api/users.php?action=update&id=' . (int)$student['id'], 'POST', ['email' => $changedEmail], $adminCookie, $adminCsrf), 200, 'Administrator changes a student email');
    $userQuery->execute([$changedEmail]);
    $emailChangedUser = $userQuery->fetch();
    account_check($emailChangedUser && (int)$emailChangedUser['is_active'] === 0 && $emailChangedUser['email_verified_at'] === null, 'Changing a student email must disable the account until the new address is verified.');
    $changedEmailLogin = null;
    account_expect(account_request($base, '/api/auth.php?action=login', 'POST', ['email' => $changedEmail, 'password' => 'NewStudentPassword!456'], $changedEmailLogin), 401, 'Student cannot sign in until changed email is verified');
    $db->prepare("UPDATE account_action_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE user_id = ? AND purpose = 'password_reset'")->execute([(int)$student['id']]);
    $db->prepare("INSERT INTO account_action_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, 'password_reset', ?, DATE_SUB(NOW(), INTERVAL 1 MINUTE))")->execute([(int)$student['id'], hash('sha256', str_repeat('a', 64))]);
    account_expect(account_request($base, '/api/accounts.php?action=reset_password', 'POST', ['token' => str_repeat('a', 64), 'password' => 'ExpiredStudentPassword!456'], $cookie), 422, 'Expired reset token rejected');
    echo 'All student account lifecycle HTTP integration checks passed.' . PHP_EOL;
} finally {
    proc_terminate($server);
    proc_close($server);
    $testEmails = array_values(array_filter([$email, $newEmail, $adminEmail, $unverifiedEmail]));
    if ($testEmails) {
        $placeholders = implode(',', array_fill(0, count($testEmails), '?'));
        $db->prepare("DELETE FROM account_action_attempts WHERE email IN ({$placeholders})")->execute($testEmails);
    }
    $testUserIds = array_values(array_filter([$studentId, $adminId, $unverifiedId]));
    if ($testUserIds) {
        $placeholders = implode(',', array_fill(0, count($testUserIds), '?'));
        $db->prepare("DELETE FROM audit_logs WHERE user_id IN ({$placeholders}) OR (entity_type = 'user' AND entity_id IN ({$placeholders}))")->execute([...$testUserIds, ...$testUserIds]);
        $db->prepare("DELETE FROM users WHERE id IN ({$placeholders})")->execute($testUserIds);
    }
    @unlink($mailLog);
}
