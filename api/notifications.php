<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_notification_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid notification id is required.', 422);
    return (int)$id;
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = $limit === false || $limit === null ? 50 : max(1, min(100, $limit));
    $stmt = $db->prepare("SELECT id, title, title_bn, message, message_bn, type, target_role, action_url,
        created_at, read_at
        FROM notifications
        WHERE recipient_user_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC, id DESC
        LIMIT {$limit}");
    $stmt->execute([(int)$actor['id']]);
    $items = $stmt->fetchAll();
    $count = $db->prepare('SELECT COUNT(*) FROM notifications WHERE recipient_user_id = ? AND deleted_at IS NULL AND read_at IS NULL');
    $count->execute([(int)$actor['id']]);
    aec_ok(['items' => $items, 'unread_count' => (int)$count->fetchColumn()]);
}

if ($action === 'mark_read') {
    aec_method(['POST']);
    $actor = aec_current_user();
    aec_csrf_check();
    $id = aec_notification_id();
    $stmt = $db->prepare('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND recipient_user_id = ? AND deleted_at IS NULL');
    $stmt->execute([$id, (int)$actor['id']]);
    if ($stmt->rowCount() === 0) {
        $exists = $db->prepare('SELECT id FROM notifications WHERE id = ? AND recipient_user_id = ? AND deleted_at IS NULL');
        $exists->execute([$id, (int)$actor['id']]);
        if (!$exists->fetchColumn()) aec_fail('Notification not found.', 404);
    }
    aec_ok(['id' => $id, 'is_read' => true], 'Notification marked as read.');
}

if ($action === 'mark_all_read') {
    aec_method(['POST']);
    $actor = aec_current_user();
    aec_csrf_check();
    $stmt = $db->prepare('UPDATE notifications SET read_at = NOW() WHERE recipient_user_id = ? AND deleted_at IS NULL AND read_at IS NULL');
    $stmt->execute([(int)$actor['id']]);
    aec_ok(['updated' => $stmt->rowCount()], 'All notifications marked as read.');
}

if ($action === 'delete') {
    aec_method(['POST']);
    $actor = aec_current_user();
    aec_csrf_check();
    $id = aec_notification_id();
    $stmt = $db->prepare('UPDATE notifications SET deleted_at = NOW() WHERE id = ? AND recipient_user_id = ? AND deleted_at IS NULL');
    $stmt->execute([$id, (int)$actor['id']]);
    if ($stmt->rowCount() === 0) aec_fail('Notification not found.', 404);
    aec_ok(['id' => $id], 'Notification removed from your inbox.');
}

if ($action === 'broadcast') {
    aec_method(['POST']);
    $actor = aec_require_permission('notifications.broadcast');
    aec_csrf_check();
    $input = aec_input();
    $title = trim((string)($input['title'] ?? ''));
    $titleBn = trim((string)($input['title_bn'] ?? ''));
    $message = trim((string)($input['message'] ?? ''));
    $messageBn = trim((string)($input['message_bn'] ?? ''));
    $type = (string)($input['type'] ?? 'info');
    $targetRole = (string)($input['target_role'] ?? 'all');
    $actionUrl = trim((string)($input['action_url'] ?? ''));

    if ($title === '' || mb_strlen($title) > 180) aec_fail('Announcement title is required and must not exceed 180 characters.', 422);
    if ($titleBn !== '' && mb_strlen($titleBn) > 180) aec_fail('Bangla title must not exceed 180 characters.', 422);
    if ($message === '' || mb_strlen($message) > 4000) aec_fail('Announcement message is required and must not exceed 4000 characters.', 422);
    if ($messageBn !== '' && mb_strlen($messageBn) > 4000) aec_fail('Bangla message must not exceed 4000 characters.', 422);
    if (!in_array($type, ['info','success','warning','alert'], true)) aec_fail('Invalid notification type.', 422);
    $roles = ['all','super_admin','admin','branch_manager','teacher','assistant_teacher','accountant','student','guardian','support_staff'];
    if (!in_array($targetRole, $roles, true)) aec_fail('Invalid notification audience.', 422);
    if ($actionUrl !== '' && !preg_match('/^[a-z][a-z0-9_-]{0,79}$/', $actionUrl)) aec_fail('Action destination must be an internal dashboard tab key.', 422);

    $rate = $db->prepare("SELECT COUNT(*) FROM audit_logs WHERE user_id = ? AND action = 'notification.broadcast' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $rate->execute([(int)$actor['id']]);
    if ((int)$rate->fetchColumn() >= 20) aec_fail('Broadcast rate limit reached. Try again later.', 429);

    if ($targetRole === 'all') {
        $recipientStmt = $db->query('SELECT id FROM users WHERE is_active = 1 ORDER BY id ASC');
    } else {
        $recipientStmt = $db->prepare('SELECT id FROM users WHERE is_active = 1 AND role = ? ORDER BY id ASC');
        $recipientStmt->execute([$targetRole]);
    }
    $recipientIds = array_map('intval', $recipientStmt->fetchAll(PDO::FETCH_COLUMN));
    if (count($recipientIds) === 0) aec_fail('There are no active users in the selected audience.', 422);
    if (count($recipientIds) > 10000) aec_fail('Audience exceeds the 10,000-recipient safety limit. Narrow the target role.', 413);

    $db->beginTransaction();
    try {
        $insert = $db->prepare('INSERT INTO notifications
            (recipient_user_id, sender_user_id, title, title_bn, message, message_bn, type, target_role, action_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($recipientIds as $recipientId) {
            $insert->execute([
                $recipientId, (int)$actor['id'], $title, $titleBn ?: null, $message, $messageBn ?: null,
                $type, $targetRole, $actionUrl ?: null,
            ]);
        }
        $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, ip_address, metadata)
            VALUES (?, 'notification.broadcast', 'notification', ?, ?)")
            ->execute([
                (int)$actor['id'],
                substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
                json_encode(['target_role' => $targetRole, 'recipient_count' => count($recipientIds), 'type' => $type]),
            ]);
        $db->commit();
        aec_ok(['recipient_count' => count($recipientIds), 'target_role' => $targetRole], 'Broadcast saved to recipient inboxes.', 201);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log('AEC notification broadcast failed: ' . $e->getMessage());
        aec_fail('Notification broadcast could not be saved.', 500);
    }
}

aec_fail('Unknown notification action.', 404);
