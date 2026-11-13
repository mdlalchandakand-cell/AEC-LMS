<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$db = aec_db();

if ($action === 'login') {
    aec_method(['POST']);
    $input = aec_input();
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $password = (string)($input['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') aec_fail('Enter a valid email and password.', 422);

    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    $db->prepare('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)')->execute();
    $limit = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND ip_address = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
    $limit->execute([$email, $ip]);
    if ((int)$limit->fetchColumn() >= 8) aec_fail('Too many login attempts. Try again in 15 minutes.', 429);

    $stmt = $db->prepare('SELECT id, name, email, phone, password_hash, role, branch_id, is_active, session_version FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !(bool)$user['is_active'] || !password_verify($password, $user['password_hash'])) {
        $db->prepare('INSERT INTO login_attempts (email, ip_address) VALUES (?, ?)')->execute([$email, $ip]);
        aec_fail('Invalid email or password.', 401);
    }

    $db->prepare('DELETE FROM login_attempts WHERE email = ? AND ip_address = ?')->execute([$email, $ip]);
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['session_version'] = (int)$user['session_version'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    unset($user['password_hash'], $user['is_active'], $user['session_version']);
    aec_ok(['user' => $user, 'csrf_token' => $_SESSION['csrf_token']], 'Login successful.');
}

if ($action === 'me') {
    aec_method(['GET']);
    $user = aec_current_user();
    aec_ok(['user' => $user, 'csrf_token' => $_SESSION['csrf_token'] ?? null]);
}

if ($action === 'logout') {
    aec_method(['POST']);
    aec_current_user();
    aec_csrf_check();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    aec_ok(null, 'Logged out.');
}

if ($action === 'change_password') {
    aec_method(['POST']);
    $user = aec_current_user();
    aec_csrf_check();
    $input = aec_input();
    $current = (string)($input['current_password'] ?? '');
    $next = (string)($input['new_password'] ?? '');
    if (strlen($next) < 12) aec_fail('New password must be at least 12 characters.', 422);
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    if (!password_verify($current, (string)$stmt->fetchColumn())) aec_fail('Current password is incorrect.', 422);
    $hash = password_hash($next, PASSWORD_DEFAULT);
    $db->prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = NOW() WHERE id = ?')->execute([$hash, $user['id']]);
    $db->prepare("UPDATE account_action_tokens SET consumed_at = NOW() WHERE user_id = ? AND purpose = 'password_reset' AND consumed_at IS NULL")->execute([(int)$user['id']]);
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'user.password_changed', 'user', ?, ?, ?)")
        ->execute([(int)$user['id'], (int)$user['id'], substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['method' => 'authenticated'])]);
    session_regenerate_id(true);
    $versionStmt = $db->prepare('SELECT session_version FROM users WHERE id = ?');
    $versionStmt->execute([(int)$user['id']]);
    $_SESSION['session_version'] = (int)$versionStmt->fetchColumn();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    aec_ok(['csrf_token' => $_SESSION['csrf_token']], 'Password updated.');
}

aec_fail('Unknown authentication action.', 404);
