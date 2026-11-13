<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_recycle_audit(PDO $db, array $actor, string $event, array $item, array $meta = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'recycle_bin:' . $item['entity_type'], (int)$item['entity_id'],
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_recycle_scope(array $actor, array $item): void {
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id']) || $item['branch_id'] === null || (int)$item['branch_id'] !== (int)$actor['branch_id']) {
            aec_fail('This recycle-bin item is outside your assigned branch.', 403);
        }
    }
}

function aec_recycle_snapshot(array $item): array {
    $value = $item['snapshot'] ?? [];
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
    return is_array($value) ? $value : [];
}

function aec_recycle_entity_map(string $type): array {
    $map = [
        'course' => ['table' => 'courses'],
        'content' => ['table' => 'content_items'],
        'batch' => ['table' => 'batches'],
        'exam' => ['table' => 'exams'],
        'cms_post' => ['table' => 'cms_posts'],
        'cms_testimonial' => ['table' => 'cms_testimonials'],
    ];
    if (!isset($map[$type])) aec_fail('Unsupported recycle-bin entity type.', 422);
    return $map[$type];
}

function aec_recycle_has_references(PDO $db, string $parentTable, int $entityId): ?string {
    $refs = $db->prepare("SELECT TABLE_NAME, COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME = ?
          AND REFERENCED_COLUMN_NAME = 'id'");
    $refs->execute([$parentTable]);
    foreach ($refs->fetchAll() as $ref) {
        $table = (string)$ref['TABLE_NAME'];
        $column = (string)$ref['COLUMN_NAME'];
        if (!preg_match('/^[A-Za-z0-9_]+$/', $table) || !preg_match('/^[A-Za-z0-9_]+$/', $column)) {
            return 'A related database reference could not be safely inspected.';
        }
        $count = $db->prepare("SELECT COUNT(*) FROM `{$table}` WHERE `{$column}` = ?");
        $count->execute([$entityId]);
        if ((int)$count->fetchColumn() > 0) {
            return 'Linked ' . str_replace('_', ' ', $table) . ' records remain; historical data is retained.';
        }
    }
    return null;
}

function aec_recycle_mark_purged(PDO $db, array $actor, array $item, string $reason = 'Original record was already absent.'): void {
    $db->prepare("UPDATE recycle_bin_items
        SET status = 'purged', purged_by = ?, purged_at = NOW(), purge_error = NULL
        WHERE id = ? AND status = 'active'")
        ->execute([(int)$actor['id'], (int)$item['id']]);
    aec_recycle_audit($db, $actor, 'recycle_bin.permanently_deleted', $item, ['note' => $reason]);
}

function aec_recycle_purge(PDO $db, array $actor, array $item): array {
    if (empty($item['retention_elapsed'])) {
        return ['purged' => false, 'reason' => 'The 30-day retention period has not elapsed.'];
    }

    $entityId = (int)$item['entity_id'];
    $type = (string)$item['entity_type'];
    $map = aec_recycle_entity_map($type);
    $table = $map['table'];
    $entityStmt = $db->prepare("SELECT deleted_at FROM `{$table}` WHERE id = ? LIMIT 1 FOR UPDATE");
    $entityStmt->execute([$entityId]);
    $entity = $entityStmt->fetch();

    if (!$entity) {
        aec_recycle_mark_purged($db, $actor, $item);
        return ['purged' => true, 'reason' => null];
    }
    if ($entity['deleted_at'] === null) {
        $db->prepare("UPDATE recycle_bin_items SET status = 'restored', restored_by = ?, restored_at = NOW(), purge_error = NULL WHERE id = ? AND status = 'active'")
            ->execute([(int)$actor['id'], (int)$item['id']]);
        aec_recycle_audit($db, $actor, 'recycle_bin.restore_reconciled', $item);
        return ['purged' => false, 'reason' => 'The original record has already been restored; its recycle-bin entry was reconciled.'];
    }

    if ($type === 'content') {
        $media = $db->prepare('SELECT media_url FROM content_items WHERE id = ?');
        $media->execute([$entityId]);
        $mediaUrl = (string)($media->fetchColumn() ?: '');
        if ($mediaUrl !== '' && (str_contains($mediaUrl, '/storage/private/') || str_contains($mediaUrl, '/api/media.php'))) {
            $blocked = 'Content references a private media file; remove or reassign the media asset before permanent deletion.';
            $db->prepare("UPDATE recycle_bin_items SET purge_error = ? WHERE id = ? AND status = 'active'")->execute([$blocked, (int)$item['id']]);
            return ['purged' => false, 'reason' => $blocked];
        }
    }

    $blocked = aec_recycle_has_references($db, $table, $entityId);
    if ($blocked !== null) {
        $db->prepare("UPDATE recycle_bin_items SET purge_error = ? WHERE id = ? AND status = 'active'")->execute([$blocked, (int)$item['id']]);
        return ['purged' => false, 'reason' => $blocked];
    }

    try {
        $delete = $db->prepare("DELETE FROM `{$table}` WHERE id = ? AND deleted_at IS NOT NULL");
        $delete->execute([$entityId]);
        if ($delete->rowCount() !== 1) {
            $blocked = 'The original record changed while permanent deletion was being checked.';
            $db->prepare("UPDATE recycle_bin_items SET purge_error = ? WHERE id = ? AND status = 'active'")->execute([$blocked, (int)$item['id']]);
            return ['purged' => false, 'reason' => $blocked];
        }
    } catch (PDOException $error) {
        if ($error->getCode() !== '23000') throw $error;
        $blocked = 'Linked records prevent permanent deletion; the original data has been retained.';
        $db->prepare("UPDATE recycle_bin_items SET purge_error = ? WHERE id = ? AND status = 'active'")->execute([$blocked, (int)$item['id']]);
        return ['purged' => false, 'reason' => $blocked];
    }

    $db->prepare("UPDATE recycle_bin_items SET status = 'purged', purged_by = ?, purged_at = NOW(), purge_error = NULL WHERE id = ? AND status = 'active'")
        ->execute([(int)$actor['id'], (int)$item['id']]);
    aec_recycle_audit($db, $actor, 'recycle_bin.permanently_deleted', $item);
    return ['purged' => true, 'reason' => null];
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('recycle_bin.manage');
    aec_assert_active_branch($db, $actor);

    $sql = "SELECT r.id, r.entity_type, r.entity_id, r.title, r.branch_id, r.status,
        r.deleted_at, r.expires_at, r.purge_error, COALESCE(u.name, 'System / previous deletion') AS deleted_by,
        GREATEST(0, DATEDIFF(r.expires_at, CURDATE())) AS retention_days_left
        FROM recycle_bin_items r LEFT JOIN users u ON u.id = r.deleted_by
        WHERE r.status = 'active'";
    $params = [];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND r.branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $sql .= ' ORDER BY r.deleted_at DESC, r.id DESC LIMIT 1000';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'restore') {
    aec_method(['POST']);
    $actor = aec_require_permission('recycle_bin.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid recycle-bin item id is required.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT *, (expires_at > NOW()) AS can_restore FROM recycle_bin_items WHERE id = ? AND status = 'active' LIMIT 1 FOR UPDATE");
        $stmt->execute([$id]); $item = $stmt->fetch();
        if (!$item) aec_fail('Active recycle-bin item not found.', 404);
        aec_recycle_scope($actor, $item);
        if (!(bool)$item['can_restore']) aec_fail('The 30-day retention period has expired; this item can no longer be restored.', 409);

        $snapshot = aec_recycle_snapshot($item);
        $entityId = (int)$item['entity_id'];
        $type = (string)$item['entity_type'];
        $restored = 0;

        if ($type === 'course') {
            $sql = 'UPDATE courses SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL';
            $params = [(string)($snapshot['status'] ?? 'draft'), $entityId];
            if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
            $restore = $db->prepare($sql); $restore->execute($params); $restored = $restore->rowCount();
        } elseif ($type === 'content') {
            $restore = $db->prepare('UPDATE content_items SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([(string)($snapshot['status'] ?? 'draft'), $entityId]); $restored = $restore->rowCount();
        } elseif ($type === 'batch') {
            $duplicate = $db->prepare('SELECT id FROM batches WHERE branch_scope_id = COALESCE(?, 0) AND batch_code = (SELECT batch_code FROM batches WHERE id = ?) AND id <> ? AND deleted_at IS NULL LIMIT 1');
            $duplicate->execute([$item['branch_id'], $entityId, $entityId]);
            if ($duplicate->fetchColumn()) aec_fail('Another active batch uses this code. Rename the other batch before restoring.', 409);
            $sql = 'UPDATE batches SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL';
            $params = [(string)($snapshot['status'] ?? 'upcoming'), $entityId];
            if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
            $restore = $db->prepare($sql); $restore->execute($params); $restored = $restore->rowCount();
        } elseif ($type === 'exam') {
            $sql = 'UPDATE exams e JOIN courses c ON c.id = e.course_id SET e.deleted_at = NULL, e.status = ?, e.updated_at = NOW() WHERE e.id = ? AND e.deleted_at IS NOT NULL';
            $params = [(string)($snapshot['status'] ?? 'draft'), $entityId];
            if ($actor['role'] === 'branch_manager') { $sql .= ' AND c.branch_id = ?'; $params[] = (int)$actor['branch_id']; }
            $restore = $db->prepare($sql); $restore->execute($params); $restored = $restore->rowCount();
        } elseif ($type === 'cms_post') {
            $restore = $db->prepare('UPDATE cms_posts SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([(string)($snapshot['status'] ?? 'draft'), $entityId]); $restored = $restore->rowCount();
        } elseif ($type === 'cms_testimonial') {
            $restore = $db->prepare('UPDATE cms_testimonials SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([(string)($snapshot['status'] ?? 'draft'), $entityId]); $restored = $restore->rowCount();
        }
        if (!$restored) aec_fail('The original record is unavailable or has already been restored.', 409);
        $db->prepare("UPDATE recycle_bin_items SET status = 'restored', restored_by = ?, restored_at = NOW(), purge_error = NULL WHERE id = ?")
            ->execute([(int)$actor['id'], $id]);
        aec_recycle_audit($db, $actor, 'recycle_bin.restored', $item);
        $db->commit();
        aec_ok(['id' => $id, 'entity_type' => $type, 'entity_id' => $entityId], 'Item restored.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'permanent_delete') {
    aec_method(['POST']);
    $actor = aec_require_permission('recycle_bin.purge');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid recycle-bin item id is required.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT *, (expires_at <= NOW()) AS retention_elapsed FROM recycle_bin_items WHERE id = ? AND status = 'active' LIMIT 1 FOR UPDATE");
        $stmt->execute([$id]); $item = $stmt->fetch();
        if (!$item) aec_fail('Active recycle-bin item not found.', 404);
        if (!(bool)$item['retention_elapsed']) aec_fail('Permanent deletion is available only after the 30-day retention period.', 409);
        $result = aec_recycle_purge($db, $actor, $item);
        if (!$result['purged']) {
            $db->commit();
            aec_fail((string)$result['reason'], 409);
        }
        $db->commit();
        aec_ok(['id' => $id], 'Item permanently deleted.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'purge_expired') {
    aec_method(['POST']);
    $actor = aec_require_permission('recycle_bin.purge');
    aec_csrf_check();
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = $limit === false || $limit === null ? 100 : max(1, min(100, (int)$limit));
    $ids = $db->prepare("SELECT id FROM recycle_bin_items WHERE status = 'active' AND expires_at <= NOW() ORDER BY expires_at ASC, id ASC LIMIT {$limit}");
    $ids->execute();
    $itemIds = array_map('intval', $ids->fetchAll(PDO::FETCH_COLUMN));
    $purged = 0; $blocked = [];
    foreach ($itemIds as $itemId) {
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT *, (expires_at <= NOW()) AS retention_elapsed FROM recycle_bin_items WHERE id = ? AND status = 'active' FOR UPDATE");
            $stmt->execute([$itemId]); $item = $stmt->fetch();
            if (!$item || !(bool)$item['retention_elapsed']) { $db->commit(); continue; }
            $result = aec_recycle_purge($db, $actor, $item);
            if ($result['purged']) $purged++;
            else $blocked[] = ['id' => $itemId, 'title' => $item['title'], 'reason' => $result['reason']];
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('AEC recycle-bin purge failed for item ' . $itemId . ': ' . $error->getMessage());
            $blocked[] = ['id' => $itemId, 'reason' => 'Deletion failed safely; the original record was retained.'];
        }
    }
    aec_ok(['purged' => $purged, 'blocked' => $blocked], $purged . ' item(s) purged; ' . count($blocked) . ' retained.');
}

aec_fail('Unknown recycle-bin action.', 404);
