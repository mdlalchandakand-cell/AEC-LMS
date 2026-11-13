<?php
declare(strict_types=1);

/**
 * Alom's English Center LMS API bootstrap.
 * Configure database credentials as server environment variables. Never commit secrets.
 */
const AEC_API_VERSION = '1.0.0';

function aec_env(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    return $value === false || $value === '' ? $default : $value;
}

function aec_json(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function aec_ok(mixed $data = null, string $message = 'OK', int $status = 200): never {
    aec_json(['success' => true, 'message' => $message, 'data' => $data], $status);
}

function aec_fail(string $message, int $status = 400, array $extra = []): never {
    aec_json(['success' => false, 'message' => $message, 'error' => $message] + $extra, $status);
}

function aec_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host = aec_env('AEC_DB_HOST');
    $name = aec_env('AEC_DB_NAME');
    $user = aec_env('AEC_DB_USER');
    $pass = aec_env('AEC_DB_PASS');
    if (!$host || !$name || !$user) aec_fail('Database is not configured. Set AEC_DB_HOST, AEC_DB_NAME, AEC_DB_USER and AEC_DB_PASS.', 503);
    $port = aec_env('AEC_DB_PORT');
    if ($port !== null && (!ctype_digit($port) || (int)$port < 1 || (int)$port > 65535)) {
        aec_fail('AEC_DB_PORT must be a valid TCP port.', 503);
    }
    $dsn = $port
        ? sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name)
        : sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $name);
    try {
        $pdo = new PDO($dsn, $user, $pass ?? '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log('AEC database connection failed: ' . $e->getMessage());
        aec_fail('Database connection failed.', 503);
    }
    return $pdo;
}

function aec_notify_user(
    PDO $db,
    int $recipientUserId,
    ?int $senderUserId,
    string $title,
    string $message,
    string $type = 'info',
    ?string $actionUrl = null,
    ?string $titleBn = null,
    ?string $messageBn = null
): void {
    if ($recipientUserId < 1 || trim($title) === '' || trim($message) === '') return;
    if (!in_array($type, ['info', 'success', 'warning', 'alert'], true)) $type = 'info';
    if ($actionUrl !== null && !preg_match('/^[a-z][a-z0-9_-]{0,79}$/', $actionUrl)) $actionUrl = null;
    try {
        $stmt = $db->prepare('INSERT INTO notifications
            (recipient_user_id, sender_user_id, title, title_bn, message, message_bn, type, target_role, action_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, \'all\', ?)');
        $stmt->execute([
            $recipientUserId,
            $senderUserId && $senderUserId > 0 ? $senderUserId : null,
            mb_substr(trim($title), 0, 180),
            $titleBn !== null && trim($titleBn) !== '' ? mb_substr(trim($titleBn), 0, 180) : null,
            mb_substr(trim($message), 0, 4000),
            $messageBn !== null && trim($messageBn) !== '' ? mb_substr(trim($messageBn), 0, 4000) : null,
            $type,
            $actionUrl,
        ]);
    } catch (Throwable $e) {
        error_log('AEC notification insert failed: ' . $e->getMessage());
    }
}

function aec_recycle_bin_record(PDO $db, array $actor, string $entityType, int $entityId, string $title, ?int $branchId, array $snapshot): void {
    $allowed = ['course','content','batch','exam','cms_post','cms_testimonial'];
    if (!in_array($entityType, $allowed, true) || $entityId < 1) {
        throw new InvalidArgumentException('Invalid recycle-bin entity.');
    }
    $title = trim($title);
    if ($title === '' || mb_strlen($title) > 220) throw new InvalidArgumentException('Recycle-bin title is invalid.');
    $encoded = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) throw new RuntimeException('Could not serialize recycle-bin snapshot.');

    // The generated unique active-slot key prevents concurrent duplicate active
    // records. INSERT IGNORE followed by UPDATE refreshes the existing active
    // snapshot and its 30-day window when the same entity is deleted again.
    $insert = $db->prepare("INSERT IGNORE INTO recycle_bin_items
        (entity_type, entity_id, title, branch_id, deleted_by, snapshot, status, deleted_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))");
    $insert->execute([$entityType, $entityId, $title, $branchId, (int)$actor['id'], $encoded]);

    $update = $db->prepare("UPDATE recycle_bin_items
        SET title = ?, branch_id = ?, deleted_by = ?, snapshot = ?, deleted_at = NOW(),
            expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY), purge_error = NULL
        WHERE entity_type = ? AND entity_id = ? AND status = 'active'");
    $update->execute([$title, $branchId, (int)$actor['id'], $encoded, $entityType, $entityId]);
}

function aec_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('AEC_LMS_SESSION');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/', 'secure' => $https,
        'httponly' => true, 'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();
}

function aec_method(array $allowed): string {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, $allowed, true)) aec_fail('Method not allowed.', 405);
    return $method;
}

function aec_input(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > 1048576) aec_fail('Request body is too large.', 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) aec_fail('Request body must be valid JSON.', 400);
    return $data;
}

function aec_csrf_check(): void {
    $expected = $_SESSION['csrf_token'] ?? '';
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$expected || !$provided || !hash_equals($expected, $provided)) aec_fail('Invalid or missing CSRF token.', 419);
}

function aec_current_user(): array {
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) aec_fail('Authentication required.', 401);
    $stmt = aec_db()->prepare('SELECT id, name, email, phone, role, branch_id, is_active, session_version FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user || !(bool)$user['is_active']) {
        $_SESSION = [];
        session_regenerate_id(true);
        aec_fail('Account is unavailable.', 401);
    }
    if ((int)($_SESSION['session_version'] ?? 1) !== (int)$user['session_version']) {
        $_SESSION = [];
        session_regenerate_id(true);
        aec_fail('Your session has expired. Please sign in again.', 401);
    }
    unset($user['session_version']);
    return $user;
}

function aec_require_permission(string $permission): array {
    $user = aec_current_user();
    if ($user['role'] === 'super_admin') return $user;
    $stmt = aec_db()->prepare('SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = ? LIMIT 1');
    $stmt->execute([$user['role'], $permission]);
    if (!(bool)$stmt->fetchColumn()) aec_fail('You do not have permission to perform this action.', 403);
    return $user;
}

function aec_assert_active_branch(PDO $db, array $actor): void {
    if (($actor['role'] ?? '') !== 'branch_manager') return;
    $branchId = filter_var($actor['branch_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$branchId || $branchId < 1) aec_fail('Your account is not assigned to a branch.', 403);
    $stmt = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([(int)$branchId]);
    if (!$stmt->fetchColumn()) aec_fail('Your assigned branch is inactive. Contact an administrator.', 403);
}

function aec_bootstrap(): void {
    aec_start_session();
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Frame-Options: SAMEORIGIN');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
}
aec_bootstrap();
