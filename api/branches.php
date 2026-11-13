<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_branch_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid branch id is required.', 422);
    return (int)$id;
}

function aec_branch_audit(PDO $db, array $actor, string $event, int $branchId, array $metadata = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'branch', $branchId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_current_user();
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $stmt = $db->prepare('SELECT id, code, name, city, address, phone, is_active, created_at FROM branches WHERE id = ? LIMIT 1');
        $stmt->execute([(int)$actor['branch_id']]);
        aec_ok($stmt->fetchAll());
    }
    aec_require_permission('branches.manage');
    $stmt = $db->query('SELECT b.id, b.code, b.name, b.city, b.address, b.phone, b.is_active, b.created_at, COUNT(DISTINCT u.id) AS user_count FROM branches b LEFT JOIN users u ON u.branch_id = b.id GROUP BY b.id ORDER BY b.name ASC, b.id ASC');
    aec_ok($stmt->fetchAll());
}

if ($action === 'create') {
    aec_method(['POST']);
    $actor = aec_require_permission('branches.manage');
    aec_csrf_check();
    $input = aec_input();
    $code = strtoupper(trim((string)($input['code'] ?? '')));
    $name = trim((string)($input['name'] ?? ''));
    $city = trim((string)($input['city'] ?? ''));
    $address = trim((string)($input['address'] ?? ''));
    $phone = trim((string)($input['phone'] ?? ''));
    if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{1,31}$/', $code)) aec_fail('Branch code must be 2–32 uppercase letters, numbers, hyphens or underscores.', 422);
    if ($name === '' || mb_strlen($name) > 160) aec_fail('Branch name is required and must not exceed 160 characters.', 422);
    if (mb_strlen($city) > 120 || mb_strlen($address) > 500 || mb_strlen($phone) > 32) aec_fail('Branch contact information exceeds the allowed length.', 422);
    try {
        $stmt = $db->prepare('INSERT INTO branches (code, name, city, address, phone) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$code, $name, $city ?: null, $address ?: null, $phone ?: null]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('Branch code is already in use.', 409);
        throw $e;
    }
    $id = (int)$db->lastInsertId();
    aec_branch_audit($db, $actor, 'branch.created', $id, ['code' => $code]);
    aec_ok(['id' => $id], 'Branch created.', 201);
}

if ($action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('branches.manage');
    aec_csrf_check();
    $id = aec_branch_id();
    $input = aec_input();
    $code = strtoupper(trim((string)($input['code'] ?? '')));
    $name = trim((string)($input['name'] ?? ''));
    $city = trim((string)($input['city'] ?? ''));
    $address = trim((string)($input['address'] ?? ''));
    $phone = trim((string)($input['phone'] ?? ''));
    if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{1,31}$/', $code)) aec_fail('Branch code must be 2–32 uppercase letters, numbers, hyphens or underscores.', 422);
    if ($name === '' || mb_strlen($name) > 160) aec_fail('Branch name is required and must not exceed 160 characters.', 422);
    if (mb_strlen($city) > 120 || mb_strlen($address) > 500 || mb_strlen($phone) > 32) aec_fail('Branch contact information exceeds the allowed length.', 422);
    try {
        $stmt = $db->prepare('UPDATE branches SET code = ?, name = ?, city = ?, address = ?, phone = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$code, $name, $city ?: null, $address ?: null, $phone ?: null, $id]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('Branch code is already in use.', 409);
        throw $e;
    }
    $check = $db->prepare('SELECT id FROM branches WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetchColumn()) aec_fail('Branch not found.', 404);
    aec_branch_audit($db, $actor, 'branch.updated', $id, ['code' => $code]);
    aec_ok(['id' => $id], 'Branch updated.');
}

if ($action === 'deactivate') {
    aec_method(['POST']);
    $actor = aec_require_permission('branches.manage');
    aec_csrf_check();
    $id = aec_branch_id();
    $stmt = $db->prepare('UPDATE branches SET is_active = 0, updated_at = NOW() WHERE id = ? AND is_active = 1');
    $stmt->execute([$id]);
    if (!$stmt->rowCount()) aec_fail('Active branch not found.', 404);
    aec_branch_audit($db, $actor, 'branch.deactivated', $id);
    aec_ok(['id' => $id], 'Branch deactivated. Existing records are preserved.');
}

aec_fail('Unknown branch action.', 404);
