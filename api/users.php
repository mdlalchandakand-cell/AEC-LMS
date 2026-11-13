<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$actor = aec_require_permission('users.manage');
aec_assert_active_branch($db, $actor);
$action = $_GET['action'] ?? 'list';
$allowedRoles = ['admin', 'branch_manager', 'teacher', 'assistant_teacher', 'accountant', 'student', 'guardian', 'support_staff'];

function aec_user_audit(PDO $db, array $actor, string $action, int $targetId, array $metadata = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $action, 'user', $targetId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_validate_user_role(string $role, array $actor, array $allowedRoles): void {
    if (!in_array($role, $allowedRoles, true)) aec_fail('Invalid user role.', 422);
    if ($actor['role'] !== 'super_admin' && $role === 'admin') {
        aec_fail('Only a super administrator can create or assign administrator accounts.', 403);
    }
}

if ($action === 'list') {
    aec_method(['GET']);
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = max(1, min(100, $limit ?: 50));
    $search = trim((string)($_GET['q'] ?? ''));
    $sql = 'SELECT id, name, email, phone, role, branch_id, is_active, email_verified_at, last_login_at, created_at FROM users';
    $params = [];
    $where = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $where[] = 'branch_id = ?';
        $params[] = (int)$actor['branch_id'];
        $where[] = "(role NOT IN ('super_admin','admin','branch_manager') OR id = ?)";
        $params[] = (int)$actor['id'];
    }
    if ($search !== '') {
        $where[] = '(name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
        array_push($params, $term, $term, $term);
    }
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create') {
    aec_method(['POST']);
    aec_csrf_check();
    $input = aec_input();
    $name = trim((string)($input['name'] ?? ''));
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $phone = trim((string)($input['phone'] ?? ''));
    $password = (string)($input['password'] ?? '');
    $role = (string)($input['role'] ?? 'student');
    $branchId = isset($input['branch_id']) && $input['branch_id'] !== '' ? filter_var($input['branch_id'], FILTER_VALIDATE_INT) : null;

    if ($name === '' || mb_strlen($name) > 160) aec_fail('Name is required and must not exceed 160 characters.', 422);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('A valid email address is required.', 422);
    if (strlen($password) < 12) aec_fail('Password must be at least 12 characters.', 422);
    if ($phone !== '' && strlen($phone) > 32) aec_fail('Phone number is too long.', 422);
    if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
    aec_validate_user_role($role, $actor, $allowedRoles);
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        if (in_array($role, ['admin','branch_manager'], true)) aec_fail('Branch managers cannot create administrator or branch-manager accounts.', 403);
        $branchId = (int)$actor['branch_id'];
    } elseif ($branchId !== null) {
        $branchCheck = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
        $branchCheck->execute([$branchId]);
        if (!$branchCheck->fetchColumn()) aec_fail('An active branch is required.', 422);
    }

    $check = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) aec_fail('An account with this email already exists.', 409);

    $stmt = $db->prepare('INSERT INTO users (name, email, phone, password_hash, role, branch_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())');
    $stmt->execute([$name, $email, $phone ?: null, password_hash($password, PASSWORD_DEFAULT), $role, $branchId]);
    $id = (int)$db->lastInsertId();
    aec_user_audit($db, $actor, 'user.created', $id, ['role' => $role]);
    aec_ok(['id' => $id], 'User created.', 201);
}

if ($action === 'update') {
    aec_method(['POST']);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid user id is required.', 422);
    $input = aec_input();
    $stmt = $db->prepare('SELECT id, role, email, branch_id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) aec_fail('User not found.', 404);
    if ($actor['role'] === 'branch_manager' && (int)$target['branch_id'] !== (int)$actor['branch_id']) aec_fail('User not found.', 404);
    if ($actor['role'] === 'branch_manager' && in_array($target['role'], ['admin','branch_manager','super_admin'], true)) aec_fail('Branch managers cannot modify administrator accounts.', 403);
    if ((int)$id === (int)$actor['id'] && isset($input['role'])) aec_fail('You cannot change your own role.', 403);
    if ($target['role'] === 'super_admin' && $actor['role'] !== 'super_admin') aec_fail('Only a super administrator can modify this account.', 403);

    $fields = [];
    $values = [];
    $invalidateSessions = false;
    $emailChanged = false;
    $passwordChanged = false;
    if (array_key_exists('name', $input)) {
        $name = trim((string)$input['name']);
        if ($name === '' || mb_strlen($name) > 160) aec_fail('Name is required and must not exceed 160 characters.', 422);
        $fields[] = 'name = ?'; $values[] = $name;
    }
    if (array_key_exists('email', $input)) {
        $email = strtolower(trim((string)$input['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('A valid email address is required.', 422);
        $check = $db->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $check->execute([$email, $id]);
        if ($check->fetch()) aec_fail('An account with this email already exists.', 409);
        $fields[] = 'email = ?'; $values[] = $email;
        if (strcasecmp($email, (string)$target['email']) !== 0) {
            $emailChanged = true;
            $invalidateSessions = true;
            if ($target['role'] === 'student') {
                $fields[] = 'email_verified_at = NULL';
                $fields[] = 'is_active = 0';
            }
        }
    }
    if (array_key_exists('phone', $input)) {
        $phone = trim((string)$input['phone']);
        if (strlen($phone) > 32) aec_fail('Phone number is too long.', 422);
        $fields[] = 'phone = ?'; $values[] = $phone ?: null;
    }
    if (array_key_exists('role', $input)) {
        if ($actor['role'] === 'branch_manager') aec_fail('Branch managers cannot change user roles.', 403);
        $role = (string)$input['role'];
        aec_validate_user_role($role, $actor, $allowedRoles);
        if ($actor['role'] === 'branch_manager' && in_array($role, ['admin','branch_manager'], true)) aec_fail('Branch managers cannot assign privileged roles.', 403);
        if ($target['role'] === 'admin' && $actor['role'] !== 'super_admin') aec_fail('Only a super administrator can change an administrator role.', 403);
        $fields[] = 'role = ?'; $values[] = $role;
        if ($role !== $target['role']) $invalidateSessions = true;
    }
    if (array_key_exists('branch_id', $input)) {
        if ($actor['role'] === 'branch_manager') aec_fail('Branch managers cannot move users between branches.', 403);
        $branchId = $input['branch_id'] === null || $input['branch_id'] === '' ? null : filter_var($input['branch_id'], FILTER_VALIDATE_INT);
        if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
        if ($branchId !== null) {
            $branchCheck = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
            $branchCheck->execute([$branchId]);
            if (!$branchCheck->fetchColumn()) aec_fail('An active branch is required.', 422);
        }
        $fields[] = 'branch_id = ?'; $values[] = $branchId;
    }
    if (array_key_exists('password', $input) && $input['password'] !== '') {
        $password = (string)$input['password'];
        if (strlen($password) < 12) aec_fail('Password must be at least 12 characters.', 422);
        $fields[] = 'password_hash = ?'; $values[] = password_hash($password, PASSWORD_DEFAULT);
        $invalidateSessions = true;
        $passwordChanged = true;
    }
    if (!$fields) aec_fail('No valid fields were supplied.', 422);
    if ($invalidateSessions) $fields[] = 'session_version = session_version + 1';
    $fields[] = 'updated_at = NOW()';
    $values[] = $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
    if ($emailChanged || $passwordChanged) {
        $db->prepare('UPDATE account_action_tokens SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL')->execute([(int)$id]);
    }
    aec_user_audit($db, $actor, 'user.updated', (int)$id, ['fields' => array_keys($input)]);
    aec_ok(['id' => (int)$id], 'User updated.');
}

if ($action === 'deactivate') {
    aec_method(['POST']);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid user id is required.', 422);
    if ((int)$id === (int)$actor['id']) aec_fail('You cannot deactivate your own account.', 403);
    $stmt = $db->prepare('SELECT id, role, branch_id, is_active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) aec_fail('User not found.', 404);
    if ($actor['role'] === 'branch_manager' && (int)$target['branch_id'] !== (int)$actor['branch_id']) aec_fail('User not found.', 404);
    if ($actor['role'] === 'branch_manager' && in_array($target['role'], ['super_admin','admin','branch_manager'], true)) aec_fail('Branch managers cannot deactivate administrator accounts.', 403);
    if (in_array($target['role'], ['super_admin', 'admin'], true) && $actor['role'] !== 'super_admin') aec_fail('Only a super administrator can deactivate administrator accounts.', 403);
    $db->prepare('UPDATE users SET is_active = 0, session_version = session_version + 1, updated_at = NOW() WHERE id = ?')->execute([$id]);
    aec_user_audit($db, $actor, 'user.deactivated', (int)$id);
    aec_ok(['id' => (int)$id], 'User deactivated.');
}

aec_fail('Unknown user action.', 404);
