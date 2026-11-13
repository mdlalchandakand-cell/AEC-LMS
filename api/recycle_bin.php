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

function aec_recycle_purge(PDO $db, array $actor, array $item): array {
    $entityId = (int)$item['entity_id'];
    $type = (string)$item['entity_type'];
    $blocked = null;

    if ($type === 'course') {
        $checks = [
            'course_enrollments' => 'course_id',
            'course_payments' => 'course_id',
            'course_content' => 'course_id',
            'certificates' => 'course_id',
            'live_classes' => 'course_id',
            'teacher_course_assignments' => 'course_id',
            'batches' => 'course_id',
        ];
        foreach ($checks as $table => $column) {
            $stmt = $db->prepare("SELECT COUNT(*) FROM {$table} WHERE {$column} = ?");
            $stmt->execute([$entityId]);
            if ((int)$stmt->fetchColumn() > 0) { $blocked = 'Course has related ' . str_replace('_', ' ', $table) . ' records; archive history must be retained.'; break; }
        }
        if ($blocked === null) $db->prepare('DELETE FROM courses WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } elseif ($type === 'content') {
        $stmt = $db->prepare('SELECT COUNT(*) FROM course_content WHERE content_item_id = ?');
        $stmt->execute([$entityId]);
        if ((int)$stmt->fetchColumn() > 0) $blocked = 'Content is linked to one or more courses; unlink it before permanent deletion.';
        else $db->prepare('DELETE FROM content_items WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } elseif ($type === 'batch') {
        $enroll = $db->prepare('SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = ?');
        $enroll->execute([$entityId]);
        $routine = $db->prepare('SELECT COUNT(*) FROM batch_routine_slots WHERE batch_id = ?');
        $routine->execute([$entityId]);
        if ((int)$enroll->fetchColumn() > 0 || (int)$routine->fetchColumn() > 0) $blocked = 'Batch has student placement or routine history; it cannot be permanently deleted.';
        else $db->prepare('DELETE FROM batches WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } elseif ($type === 'exam') {
        $stmt = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ?');
        $stmt->execute([$entityId]);
        if ((int)$stmt->fetchColumn() > 0) $blocked = 'Exam has attempt/result history; it cannot be permanently deleted.';
        else $db->prepare('DELETE FROM exams WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } elseif ($type === 'cms_post') {
        $db->prepare('DELETE FROM cms_posts WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } elseif ($type === 'cms_testimonial') {
        $db->prepare('DELETE FROM cms_testimonials WHERE id = ? AND deleted_at IS NOT NULL')->execute([$entityId]);
    } else {
        $blocked = 'Unsupported recycle-bin entity type.';
    }

    if ($blocked !== null) {
        $db->prepare('UPDATE recycle_bin_items SET purge_error = ? WHERE id = ? AND status = \'active\'')->execute([$blocked, (int)$item['id']]);
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

    // Expired records are purged automatically when an administrator opens the bin.
    $expiredSql = "SELECT * FROM recycle_bin_items WHERE status = 'active' AND expires_at <= NOW()";
    $expiredParams = [];
    if ($actor['role'] === 'branch_manager') {
        $expiredSql .= ' AND branch_id = ?'; $expiredParams[] = (int)$actor['branch_id'];
    }
    $expiredStmt = $db->prepare($expiredSql); $expiredStmt->execute($expiredParams);
    foreach ($expiredStmt->fetchAll() as $expired) {
        $db->beginTransaction();
        try {
            aec_recycle_purge($db, $actor, $expired);
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('AEC recycle-bin expiry purge failed: ' . $error->getMessage());
        }
    }

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
        $stmt = $db->prepare("SELECT * FROM recycle_bin_items WHERE id = ? AND status = 'active' LIMIT 1 FOR UPDATE");
        $stmt->execute([$id]); $item = $stmt->fetch();
        if (!$item) aec_fail('Active recycle-bin item not found.', 404);
        aec_recycle_scope($actor, $item);
        $snapshot = aec_recycle_snapshot($item);
        $entityId = (int)$item['entity_id'];
        $type = (string)$item['entity_type'];
        $restored = 0;

        if ($type === 'course') {
            $sql = 'UPDATE courses SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL';
            $params = [$entityId];
            if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
            $restore = $db->prepare($sql); $restore->execute($params); $restored = $restore->rowCount();
        } elseif ($type === 'content') {
            $restore = $db->prepare('UPDATE content_items SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([$entityId]); $restored = $restore->rowCount();
        } elseif ($type === 'batch') {
            $duplicate = $db->prepare('SELECT id FROM batches WHERE branch_scope_id = COALESCE(?, 0) AND batch_code = (SELECT batch_code FROM batches WHERE id = ?) AND id <> ? AND deleted_at IS NULL LIMIT 1');
            $duplicate->execute([$item['branch_id'], $entityId, $entityId]);
            if ($duplicate->fetchColumn()) aec_fail('Another active batch uses this code. Rename the other batch before restoring.', 409);
            $restore = $db->prepare('UPDATE batches SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([$entityId]); $restored = $restore->rowCount();
        } elseif ($type === 'exam') {
            $restore = $db->prepare('UPDATE exams SET deleted_at = NULL, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL');
            $restore->execute([(string)($snapshot['status'] ?? 'draft'), $entityId]); $restored = $restore->rowCount();
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
    $actor = aec_require_permission('recycle_bin.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid recycle-bin item id is required.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT * FROM recycle_bin_items WHERE id = ? AND status = 'active' LIMIT 1 FOR UPDATE");
        $stmt->execute([$id]); $item = $stmt->fetch();
        if (!$item) aec_fail('Active recycle-bin item not found.', 404);
        aec_recycle_scope($actor, $item);
        $result = aec_recycle_purge($db, $actor, $item);
        if (!$result['purged']) aec_fail((string)$result['reason'], 409);
        $db->commit();
        aec_ok(['id' => $id], 'Item permanently deleted.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'empty') {
    aec_method(['POST']);
    $actor = aec_require_permission('recycle_bin.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $sql = "SELECT * FROM recycle_bin_items WHERE status = 'active'";
    $params = [];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $sql .= ' ORDER BY deleted_at ASC';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    $purged = 0; $blocked = [];
    foreach ($stmt->fetchAll() as $item) {
        $db->beginTransaction();
        try {
            $result = aec_recycle_purge($db, $actor, $item);
            if ($result['purged']) $purged++;
            else $blocked[] = ['id' => (int)$item['id'], 'title' => $item['title'], 'reason' => $result['reason']];
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            $blocked[] = ['id' => (int)$item['id'], 'title' => $item['title'], 'reason' => 'Deletion failed safely.'];
        }
    }
    aec_ok(['purged' => $purged, 'blocked' => $blocked], $purged . ' item(s) permanently deleted; ' . count($blocked) . ' retained due to linked records.');
}

aec_fail('Unknown recycle-bin action.', 404);
