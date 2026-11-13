<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? '');

function aec_account_rate_limit(PDO $db, string $action, string $email, int $max, int $minutes): void {
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    $db->prepare('DELETE FROM account_action_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)')->execute();
    $db->prepare('DELETE FROM account_action_tokens WHERE expires_at < (NOW() - INTERVAL 7 DAY) OR consumed_at < (NOW() - INTERVAL 7 DAY)')->execute();
    $stmt = $db->prepare('SELECT COUNT(*) FROM account_action_attempts WHERE action = ? AND email = ? AND ip_address = ? AND attempted_at > (NOW() - INTERVAL ' . $minutes . ' MINUTE)');
    $stmt->execute([$action, $email, $ip]);
    if ((int)$stmt->fetchColumn() >= $max) aec_fail('Too many requests. Please try again later.', 429);
    $db->prepare('INSERT INTO account_action_attempts (action, email, ip_address) VALUES (?, ?, ?)')->execute([$action, $email, $ip]);
}

function aec_account_issue_token(PDO $db, int $userId, string $purpose, int $ttlMinutes): string {
    $db->prepare('UPDATE account_action_tokens SET consumed_at = NOW() WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL')->execute([$userId, $purpose]);
    $token = bin2hex(random_bytes(32));
    $hash = hash('sha256', $token);
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    $ttlMinutes = max(1, min(1440, $ttlMinutes));
    $stmt = $db->prepare('INSERT INTO account_action_tokens (user_id, purpose, token_hash, expires_at, requested_ip) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ' . $ttlMinutes . ' MINUTE), ?)');
    $stmt->execute([$userId, $purpose, $hash, $ip]);
    return $token;
}

function aec_account_mail_from(): string {
    $from = trim((string)(getenv('AEC_MAIL_FROM') ?: ''));
    if ($from === '' || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
        aec_fail('Set AEC_MAIL_FROM to a valid sender mailbox before enabling account email delivery.', 503);
    }
    return $from;
}

function aec_account_send_link(string $email, string $subject, string $url, string $purpose): bool {
    $from = aec_account_mail_from();
    // These messages are plain text: HTML-escaping the URL would turn query
    // separators into &amp; and break the one-time verification/reset link.
    $body = "Alom's English Center\n\nUse this link to {$purpose}:\n{$url}\n\nIf you did not request this, you can ignore this email.\n";
    if (getenv('AEC_ENV') === 'testing' && ($sink = getenv('AEC_TEST_MAIL_LOG'))) {
        return file_put_contents($sink, json_encode(['email' => $email, 'subject' => $subject, 'url' => $url, 'body' => $body]) . PHP_EOL, FILE_APPEND | LOCK_EX) !== false;
    }
    $headers = "From: Alom's English Center <{$from}>\r\nContent-Type: text/plain; charset=UTF-8";
    return mail($email, $subject, $body, $headers);
}

function aec_account_base_url(): string {
    $configured = trim((string)(getenv('AEC_APP_URL') ?: ''));
    $parts = $configured !== '' ? parse_url($configured) : false;
    if (
        !is_array($parts)
        || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
        || empty($parts['host'])
        || isset($parts['user'])
        || isset($parts['pass'])
        || isset($parts['query'])
        || isset($parts['fragment'])
        || !filter_var($configured, FILTER_VALIDATE_URL)
    ) {
        aec_fail('Account email delivery requires AEC_APP_URL to be a valid canonical HTTPS site URL.', 503);
    }
    return rtrim($configured, '/');
}

if ($action === 'register') {
    aec_method(['POST']);
    $input = aec_input();
    $name = trim((string)($input['name'] ?? ''));
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $phone = trim((string)($input['phone'] ?? ''));
    $password = (string)($input['password'] ?? '');
    if ($name === '' || mb_strlen($name) > 160) aec_fail('Name is required and must not exceed 160 characters.', 422);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('Enter a valid email address.', 422);
    if ($phone !== '' && strlen($phone) > 32) aec_fail('Phone number is too long.', 422);
    if (strlen($password) < 12 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) aec_fail('Password must be at least 12 characters and include letters and numbers.', 422);
    $baseUrl = aec_account_base_url();
    aec_account_mail_from();
    aec_account_rate_limit($db, 'register', $email, 5, 60);
    $check = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) aec_fail('An account with this email already exists.', 409);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO users (name, email, phone, password_hash, role, is_active, email_verified_at, created_at) VALUES (?, ?, ?, ?, 'student', 0, NULL, NOW())");
        $stmt->execute([$name, $email, $phone ?: null, password_hash($password, PASSWORD_DEFAULT)]);
        $userId = (int)$db->lastInsertId();
        $token = aec_account_issue_token($db, $userId, 'verify_email', 60);
        $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (NULL, 'user.registered', 'user', ?, ?, ?)")
            ->execute([$userId, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['role' => 'student'])]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if ($error instanceof PDOException && $error->getCode() === '23000') aec_fail('An account with this email already exists.', 409);
        throw $error;
    }
    $url = $baseUrl . '/?account_action=verify_email&token=' . rawurlencode($token);
    if (!aec_account_send_link($email, "Verify your Alom's English Center account", $url, 'verify your email address')) {
        error_log('AEC registration verification email could not be sent for user id ' . $userId);
        aec_fail('Your account was created but the verification email could not be sent. Please contact the center administrator.', 503);
    }
    aec_ok(['email' => $email], 'Registration received. Check your email to verify your account.', 201);
}

if ($action === 'resend_verification') {
    aec_method(['POST']);
    $input = aec_input();
    $email = strtolower(trim((string)($input['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('Enter a valid email address.', 422);
    $baseUrl = aec_account_base_url();
    aec_account_mail_from();
    aec_account_rate_limit($db, 'resend_verification', $email, 3, 60);
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND role = 'student' AND email_verified_at IS NULL AND is_active = 0 LIMIT 1");
    $stmt->execute([$email]);
    $userId = $stmt->fetchColumn();
    if ($userId) {
        $token = aec_account_issue_token($db, (int)$userId, 'verify_email', 60);
        $url = $baseUrl . '/?account_action=verify_email&token=' . rawurlencode($token);
        if (!aec_account_send_link($email, "Verify your Alom's English Center account", $url, 'verify your email address')) {
            error_log('AEC verification resend email could not be sent for user id ' . (int)$userId);
        }
    }
    aec_ok(null, 'If an unverified student account exists, a new verification link has been sent.');
}

if ($action === 'verify_email') {
    aec_method(['POST']);
    $input = aec_input();
    $token = trim((string)($input['token'] ?? ''));
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) aec_fail('This verification link is invalid or expired.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT t.id, t.user_id FROM account_action_tokens t WHERE t.token_hash = ? AND t.purpose = 'verify_email' AND t.consumed_at IS NULL AND t.expires_at > NOW() FOR UPDATE");
        $stmt->execute([hash('sha256', $token)]);
        $record = $stmt->fetch();
        if (!$record) { $db->rollBack(); aec_fail('This verification link is invalid or expired.', 422); }
        $db->prepare('UPDATE users SET email_verified_at = NOW(), is_active = 1, updated_at = NOW() WHERE id = ?')->execute([(int)$record['user_id']]);
        $db->prepare('UPDATE account_action_tokens SET consumed_at = NOW() WHERE id = ?')->execute([(int)$record['id']]);
        $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'user.email_verified', 'user', ?, ?, ?)")
            ->execute([(int)$record['user_id'], (int)$record['user_id'], substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['method' => 'email_token'])]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    aec_ok(null, 'Email verified. You can now sign in.');
}

if ($action === 'request_password_reset') {
    aec_method(['POST']);
    $input = aec_input();
    $email = strtolower(trim((string)($input['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('Enter a valid email address.', 422);
    $baseUrl = aec_account_base_url();
    aec_account_mail_from();
    aec_account_rate_limit($db, 'password_reset', $email, 5, 60);
    $stmt = $db->prepare('SELECT id, is_active, email_verified_at FROM users WHERE email = ? AND role = ? LIMIT 1');
    $stmt->execute([$email, 'student']);
    $user = $stmt->fetch();
    if ($user && (bool)$user['is_active'] && $user['email_verified_at'] !== null) {
        $token = aec_account_issue_token($db, (int)$user['id'], 'password_reset', 30);
        $url = $baseUrl . '/?account_action=reset_password&token=' . rawurlencode($token);
        if (!aec_account_send_link($email, "Reset your Alom's English Center password", $url, 'reset your password')) {
            error_log('AEC password reset email could not be sent for user id ' . (int)$user['id']);
        }
    }
    aec_ok(null, 'If an eligible account exists, password reset instructions have been sent.');
}

if ($action === 'reset_password') {
    aec_method(['POST']);
    $input = aec_input();
    $token = trim((string)($input['token'] ?? ''));
    $password = (string)($input['password'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) aec_fail('This reset link is invalid or expired.', 422);
    if (strlen($password) < 12 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) aec_fail('Password must be at least 12 characters and include letters and numbers.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT t.id, t.user_id FROM account_action_tokens t INNER JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.purpose = 'password_reset' AND t.consumed_at IS NULL AND t.expires_at > NOW() AND u.role = 'student' AND u.is_active = 1 AND u.email_verified_at IS NOT NULL FOR UPDATE");
        $stmt->execute([hash('sha256', $token)]);
        $record = $stmt->fetch();
        if (!$record) { $db->rollBack(); aec_fail('This reset link is invalid or expired.', 422); }
        $db->prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = NOW() WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), (int)$record['user_id']]);
        $db->prepare('UPDATE account_action_tokens SET consumed_at = NOW() WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL')->execute([(int)$record['user_id'], 'password_reset']);
        $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'user.password_reset', 'user', ?, ?, ?)")
            ->execute([(int)$record['user_id'], (int)$record['user_id'], substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['method' => 'email_token'])]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    aec_ok(null, 'Password reset successful. Sign in with your new password.');
}

if ($action === 'profile') {
    aec_method(['GET', 'POST']);
    $user = aec_current_user();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $profileStmt = $db->prepare('SELECT email_verified_at FROM users WHERE id = ? LIMIT 1');
        $profileStmt->execute([(int)$user['id']]);
        aec_ok(['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'], 'phone' => $user['phone'], 'role' => $user['role'], 'branch_id' => $user['branch_id'], 'email_verified_at' => $profileStmt->fetchColumn() ?: null]);
    }
    aec_csrf_check();
    $input = aec_input();
    $name = trim((string)($input['name'] ?? ''));
    $phone = trim((string)($input['phone'] ?? ''));
    if ($name === '' || mb_strlen($name) > 160) aec_fail('Name is required and must not exceed 160 characters.', 422);
    if (strlen($phone) > 32) aec_fail('Phone number is too long.', 422);
    $db->prepare('UPDATE users SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?')->execute([$name, $phone ?: null, (int)$user['id']]);
    aec_ok(['name' => $name, 'phone' => $phone], 'Profile updated.');
}

if ($action === 'admin_activate') {
    aec_method(['POST']);
    $actor = aec_require_permission('users.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid user id is required.', 422);
    $stmt = $db->prepare('SELECT id, role, email_verified_at FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) aec_fail('User not found.', 404);
    if (in_array($target['role'], ['admin', 'super_admin'], true) && $actor['role'] !== 'super_admin') aec_fail('Only a super administrator can activate administrator accounts.', 403);
    if ($target['role'] === 'student' && $target['email_verified_at'] === null) aec_fail('Student must verify their email before activation.', 409);
    $db->prepare('UPDATE users SET is_active = 1, session_version = session_version + 1, updated_at = NOW() WHERE id = ?')->execute([(int)$id]);
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'user.activated', 'user', ?, ?, ?)")
        ->execute([(int)$actor['id'], (int)$id, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['role' => $target['role']])]);
    aec_ok(['id' => (int)$id], 'User account activated.');
}

aec_fail('Unknown account action.', 404);
