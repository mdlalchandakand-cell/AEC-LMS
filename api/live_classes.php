<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_live_class_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid live class id is required.', 422);
    return (int)$id;
}

function aec_live_class_url(string $url, string $platform): bool {
    if (strlen($url) > 2048 || !filter_var($url, FILTER_VALIDATE_URL)) return false;
    $parts = parse_url($url);
    if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https' || empty($parts['host'])) return false;
    $host = strtolower((string)$parts['host']);
    if ($platform === 'google_meet') return $host === 'meet.google.com';
    if ($platform === 'zoom') return $host === 'zoom.us' || str_ends_with($host, '.zoom.us');
    if ($platform === 'teams') return in_array($host, ['teams.microsoft.com', 'teams.live.com'], true);
    return false;
}

function aec_live_class_actor(PDO $db, int $id, array $actor): array {
    $stmt = $db->prepare('SELECT l.id, l.course_id, l.title, l.starts_at, l.instructor_id, l.branch_id, l.status, u.branch_id AS instructor_branch_id FROM live_classes l JOIN users u ON u.id = l.instructor_id WHERE l.id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) aec_fail('Live class not found.', 404);
    if ($actor['role'] === 'teacher' && (int)$row['instructor_id'] !== (int)$actor['id']) {
        aec_fail('Teachers may manage only their own live classes.', 403);
    }
    if ($actor['role'] === 'branch_manager' && ((int)$row['branch_id'] !== (int)$actor['branch_id']
        || (int)($row['instructor_branch_id'] ?? 0) !== (int)$actor['branch_id'])) {
        aec_fail('Live class not found.', 404);
    }
    if (!in_array($actor['role'], ['super_admin','admin','branch_manager','teacher'], true)) {
        aec_fail('You do not have permission to manage live classes.', 403);
    }
    return $row;
}

function aec_notify_live_class_students(PDO $db, int $courseId, ?int $branchId, int $senderId, string $title, string $message, string $type): void {
    $sql = "SELECT e.user_id FROM course_enrollments e JOIN users u ON u.id = e.user_id
        WHERE e.course_id = ? AND e.status IN ('active','completed') AND u.is_active = 1";
    $params = [$courseId];
    if ($branchId !== null) {
        $sql .= ' AND e.branch_id = ?';
        $params[] = $branchId;
    }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $recipientId) {
        aec_notify_user($db, (int)$recipientId, $senderId, $title, $message, $type, 'live_classes');
    }
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_current_user();
    aec_assert_active_branch($db, $actor);
    if ($actor['role'] === 'student') {
        $stmt = $db->prepare("SELECT l.id, l.course_id, c.title AS course_title, l.instructor_id, u.name AS instructor_name,
            l.title, l.starts_at, l.timezone, l.meeting_platform, l.meeting_url, l.recording_url, l.status
            FROM live_classes l JOIN courses c ON c.id = l.course_id JOIN users u ON u.id = l.instructor_id
            JOIN course_enrollments e ON e.course_id = l.course_id AND e.user_id = ? AND e.status IN ('active','completed') AND (e.branch_id = l.branch_id OR l.branch_id IS NULL)
            AND (l.branch_id IS NULL OR u.branch_id = l.branch_id)
            WHERE l.status <> 'cancelled'
              AND (l.branch_id IS NULL OR EXISTS (SELECT 1 FROM branches active_branch WHERE active_branch.id = l.branch_id AND active_branch.is_active = 1))
            ORDER BY l.starts_at ASC");
        $stmt->execute([(int)$actor['id']]);
        aec_ok($stmt->fetchAll());
    }
    if ($actor['role'] === 'teacher') {
        $stmt = $db->prepare("SELECT l.id, l.course_id, c.title AS course_title, l.instructor_id, u.name AS instructor_name,
            l.title, l.starts_at, l.timezone, l.meeting_platform, l.meeting_url, l.recording_url, l.status
            FROM live_classes l JOIN courses c ON c.id = l.course_id JOIN users u ON u.id = l.instructor_id
            WHERE l.instructor_id = ? ORDER BY l.starts_at ASC");
        $stmt->execute([(int)$actor['id']]);
        aec_ok($stmt->fetchAll());
    }
    $actor = aec_require_permission('live_classes.manage');
    aec_assert_active_branch($db, $actor);
    $sql = "SELECT l.id, l.course_id, c.title AS course_title, l.instructor_id, u.name AS instructor_name,
        l.title, l.starts_at, l.timezone, l.meeting_platform, l.meeting_url, l.recording_url, l.status
        FROM live_classes l JOIN courses c ON c.id = l.course_id JOIN users u ON u.id = l.instructor_id";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' WHERE l.branch_id = ? AND u.branch_id = ?';
        $params[] = (int)$actor['branch_id'];
        $params[] = (int)$actor['branch_id'];
    }
    $sql .= ' ORDER BY l.starts_at ASC LIMIT 500';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create') {
    aec_method(['POST']);
    $actor = aec_require_permission('live_classes.manage');
    aec_assert_active_branch($db, $actor);
    if (!in_array($actor['role'], ['super_admin','admin','branch_manager','teacher'], true)) aec_fail('This role cannot schedule live classes.', 403);
    if ($actor['role'] === 'branch_manager' && empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
    aec_csrf_check();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $instructorId = $actor['role'] === 'teacher'
        ? (int)$actor['id']
        : filter_var($input['instructor_id'] ?? $actor['id'], FILTER_VALIDATE_INT);
    $title = trim((string)($input['title'] ?? ''));
    $date = (string)($input['date'] ?? '');
    $time = (string)($input['time'] ?? '');
    $platform = (string)($input['meeting_platform'] ?? '');
    $meetingUrl = trim((string)($input['meeting_url'] ?? ''));
    if (!$courseId || $courseId < 1 || !$instructorId || $instructorId < 1) aec_fail('A valid course and instructor are required.', 422);
    if ($title === '' || mb_strlen($title) > 180) aec_fail('Class title is required (maximum 180 characters).', 422);
    $scheduled = DateTime::createFromFormat('!Y-m-d H:i', $date . ' ' . $time, new DateTimeZone('Asia/Dhaka'));
    $dateErrors = DateTime::getLastErrors();
    if (!$scheduled || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) || $scheduled->format('Y-m-d H:i') !== $date . ' ' . $time) {
        aec_fail('A valid Bangladesh-local date and time are required.', 422);
    }
    if (!in_array($platform, ['google_meet','zoom','teams'], true) || !aec_live_class_url($meetingUrl, $platform)) {
        aec_fail('Meeting URL must be a valid HTTPS link for the selected platform.', 422);
    }
    $course = $db->prepare("SELECT id, title, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $course->execute([$courseId]);
    $courseRow = $course->fetch();
    if (!$courseRow) aec_fail('Course not found.', 404);
    $instructor = $db->prepare("SELECT id, branch_id FROM users WHERE id = ? AND role IN ('teacher','assistant_teacher') AND is_active = 1 LIMIT 1");
    $instructor->execute([$instructorId]);
    $instructorRow = $instructor->fetch();
    if (!$instructorRow) aec_fail('An active teacher account is required.', 422);
    if ($courseRow['branch_id'] !== null && (int)($instructorRow['branch_id'] ?? 0) !== (int)$courseRow['branch_id']) {
        aec_fail('Instructor and course must belong to the same branch.', 422);
    }
    if ($actor['role'] === 'branch_manager') {
        if ((int)$courseRow['branch_id'] !== (int)$actor['branch_id'] || (int)$instructorRow['branch_id'] !== (int)$actor['branch_id']) {
            aec_fail('Course and instructor must belong to your assigned branch.', 403);
        }
    }
    $branchId = $actor['role'] === 'branch_manager' ? (int)$actor['branch_id'] : ($courseRow['branch_id'] !== null ? (int)$courseRow['branch_id'] : ($actor['branch_id'] ?? null));
    $stmt = $db->prepare("INSERT INTO live_classes (course_id, instructor_id, branch_id, title, starts_at, meeting_platform, meeting_url, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$courseId, $instructorId, $branchId, $title, $scheduled->format('Y-m-d H:i:s'), $platform, $meetingUrl, (int)$actor['id']]);
    $id = (int)$db->lastInsertId();
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'live_class.created', 'live_class', ?, ?, ?)")
        ->execute([(int)$actor['id'], $id, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['course_id' => $courseId, 'instructor_id' => $instructorId])]);
    $startsLabel = $scheduled->format('Y-m-d H:i') . ' (Bangladesh time)';
    aec_notify_user($db, $instructorId, (int)$actor['id'], 'New live class assigned', $title . ' is scheduled for ' . $startsLabel . '.', 'info', 'live_classes');
    aec_notify_live_class_students($db, (int)$courseId, $branchId !== null ? (int)$branchId : null, (int)$actor['id'], 'New live class scheduled', $title . ' for ' . $courseRow['title'] . ' is scheduled for ' . $startsLabel . '.', 'info');
    aec_ok(['id' => $id], 'Live class scheduled.', 201);
}

if ($action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('live_classes.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_live_class_id();
    $row = aec_live_class_actor($db, $id, $actor);
    if ($row['status'] === 'cancelled') aec_fail('Cancelled live classes cannot be edited.', 409);
    $input = aec_input();
    $status = (string)($input['status'] ?? $row['status']);
    if (!in_array($status, ['upcoming','live','completed'], true)) aec_fail('Invalid live class status.', 422);
    $allowedTransitions = [
        'upcoming' => ['live', 'completed'],
        'live' => ['completed'],
        'completed' => [],
    ];
    if ($status !== $row['status'] && !in_array($status, $allowedTransitions[$row['status']] ?? [], true)) {
        aec_fail('The requested live class status transition is not allowed.', 409);
    }
    $recordingUrl = array_key_exists('recording_url', $input) ? trim((string)$input['recording_url']) : null;
    if ($recordingUrl !== null && $recordingUrl !== '' &&
        (!filter_var($recordingUrl, FILTER_VALIDATE_URL) || strtolower((string)parse_url($recordingUrl, PHP_URL_SCHEME)) !== 'https')) {
        aec_fail('Recording URL must use HTTPS.', 422);
    }
    $db->prepare('UPDATE live_classes SET status = ?, recording_url = COALESCE(?, recording_url), updated_at = NOW() WHERE id = ?')
        ->execute([$status, $recordingUrl ?: null, $id]);
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'live_class.updated', 'live_class', ?, ?, ?)")
        ->execute([(int)$actor['id'], $id, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['status' => $status])]);
    if ($status !== $row['status'] && in_array($status, ['live','completed'], true)) {
        $label = $status === 'live' ? 'Live class started' : 'Live class completed';
        $message = $status === 'live'
            ? $row['title'] . ' has started. Open the Live Classes page to join.'
            : $row['title'] . ' has been marked as completed.';
        aec_notify_live_class_students($db, (int)$row['course_id'], $row['branch_id'] !== null ? (int)$row['branch_id'] : null, (int)$actor['id'], $label, $message, 'success');
    }
    aec_ok(['id' => $id, 'status' => $status], 'Live class updated.');
}

if ($action === 'cancel') {
    aec_method(['POST']);
    $actor = aec_require_permission('live_classes.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_live_class_id();
    $row = aec_live_class_actor($db, $id, $actor);
    if ($row['status'] === 'cancelled') aec_fail('Live class is already cancelled.', 409);
    if ($row['status'] === 'completed') aec_fail('A completed live class cannot be cancelled.', 409);
    $db->prepare("UPDATE live_classes SET status = 'cancelled', updated_at = NOW() WHERE id = ?")->execute([$id]);
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'live_class.cancelled', 'live_class', ?, ?, ?)")
        ->execute([(int)$actor['id'], $id, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, '{}']);
    aec_notify_live_class_students($db, (int)$row['course_id'], $row['branch_id'] !== null ? (int)$row['branch_id'] : null, (int)$actor['id'], 'Live class cancelled', $row['title'] . ' has been cancelled.', 'warning');
    aec_ok(['id' => $id, 'status' => 'cancelled'], 'Live class cancelled.');
}

aec_fail('Unknown live class action.', 404);
