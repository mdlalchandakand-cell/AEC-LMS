<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'my';

function aec_enrollment_audit(PDO $db, array $actor, string $event, int $enrollmentId, array $meta = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'course_enrollment', $enrollmentId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_enrollment_id(string $key): int {
    $id = filter_input(INPUT_GET, $key, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid identifier is required.', 422);
    return (int)$id;
}

if ($action === 'my') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $stmt = $db->prepare("SELECT e.id, e.course_id, c.title AS course_title, c.slug AS course_slug, c.thumbnail,
        e.status, e.enrolled_at, e.starts_at, e.ends_at, e.completed_at
        FROM course_enrollments e JOIN courses c ON c.id = e.course_id
        WHERE e.user_id = ? AND c.deleted_at IS NULL ORDER BY e.enrolled_at DESC");
    $stmt->execute([(int)$actor['id']]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('enrollments.manage');
    aec_assert_active_branch($db, $actor);
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = max(1, min(200, $limit ?: 100));
    $status = (string)($_GET['status'] ?? '');
    $params = [];
    $whereParts = [];
    if ($actor = aec_current_user()) {
        if ($actor['role'] === 'branch_manager') {
            if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
            $whereParts[] = 'e.branch_id = ?';
            $params[] = (int)$actor['branch_id'];
        }
    }
    if ($status !== '') {
        if (!in_array($status, ['pending', 'active', 'completed', 'cancelled'], true)) aec_fail('Invalid enrollment status.', 422);
        $whereParts[] = 'e.status = ?';
        $params[] = $status;
    }
    $where = $whereParts ? ' WHERE ' . implode(' AND ', $whereParts) : '';
    $stmt = $db->prepare("SELECT e.id, e.user_id, u.name AS student_name, u.email AS student_email, e.course_id,
        c.title AS course_title, e.branch_id, e.status, e.enrolled_at, e.starts_at, e.ends_at,
        e.completed_at, e.notes, creator.name AS enrolled_by_name
        FROM course_enrollments e JOIN users u ON u.id = e.user_id
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN users creator ON creator.id = e.enrolled_by
        $where ORDER BY e.enrolled_at DESC LIMIT $limit");
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create') {
    aec_method(['POST']);
    $actor = aec_require_permission('enrollments.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $userId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $status = (string)($input['status'] ?? 'pending');
    $branchId = isset($input['branch_id']) && $input['branch_id'] !== '' ? filter_var($input['branch_id'], FILTER_VALIDATE_INT) : null;
    $notes = trim((string)($input['notes'] ?? ''));
    if (!$userId || !$courseId || $userId < 1 || $courseId < 1) aec_fail('Valid user_id and course_id are required.', 422);
    if (!in_array($status, ['pending', 'active', 'completed', 'cancelled'], true)) aec_fail('Invalid enrollment status.', 422);
    if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
    if (mb_strlen($notes) > 1000) aec_fail('Notes must not exceed 1000 characters.', 422);
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $branchId = (int)$actor['branch_id'];
    }

    $user = $db->prepare("SELECT id, role, is_active, branch_id FROM users WHERE id = ? LIMIT 1");
    $user->execute([$userId]);
    $student = $user->fetch();
    if (!$student || $student['role'] !== 'student' || !(bool)$student['is_active']) aec_fail('An active student account is required.', 422);
    $course = $db->prepare("SELECT id, title, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1");
    $course->execute([$courseId]);
    $courseRow = $course->fetch();
    if (!$courseRow) aec_fail('A published course is required.', 422);
    if ($actor['role'] === 'branch_manager') {
        if ((int)$student['branch_id'] !== (int)$actor['branch_id'] || (int)$courseRow['branch_id'] !== (int)$actor['branch_id']) aec_fail('Student and course must belong to your assigned branch.', 403);
    }
    if ($branchId === null) $branchId = $courseRow['branch_id'] !== null ? (int)$courseRow['branch_id'] : ($student['branch_id'] !== null ? (int)$student['branch_id'] : null);
    if ($courseRow['branch_id'] !== null && $branchId !== (int)$courseRow['branch_id']) aec_fail('Enrollment branch must match the course branch.', 422);
    if ($student['branch_id'] !== null && $branchId !== (int)$student['branch_id']) aec_fail('Enrollment branch must match the student branch.', 422);
    if ($branchId !== null) {
        $branchCheck = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
        $branchCheck->execute([$branchId]);
        if (!$branchCheck->fetchColumn()) aec_fail('An active branch is required.', 422);
    }

    try {
        $stmt = $db->prepare('INSERT INTO course_enrollments (user_id, course_id, branch_id, status, enrolled_by, notes) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([(int)$userId, (int)$courseId, $branchId, $status, (int)$actor['id'], $notes ?: null]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('This student already has an enrollment for this course.', 409);
        throw $e;
    }
    $id = (int)$db->lastInsertId();
    aec_enrollment_audit($db, $actor, 'enrollment.created', $id, ['user_id' => (int)$userId, 'course_id' => (int)$courseId, 'status' => $status]);
    aec_notify_user($db, (int)$userId, (int)$actor['id'], 'Course enrollment created', 'Your enrollment for ' . $courseRow['title'] . ' is now ' . $status . '.', $status === 'cancelled' ? 'warning' : 'success', 'courses', 'কোর্স এনরোলমেন্ট তৈরি হয়েছে', $courseRow['title'] . ' কোর্সে আপনার এনরোলমেন্টের অবস্থা: ' . $status . '।');
    aec_ok(['id' => $id], 'Enrollment created.', 201);
}

if ($action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('enrollments.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_enrollment_id('id');
    $input = aec_input();
    $stmt = $db->prepare('SELECT id, status, branch_id FROM course_enrollments WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $current = $stmt->fetch();
    if (!$current) aec_fail('Enrollment not found.', 404);
    if ($actor['role'] === 'branch_manager' && (int)$current['branch_id'] !== (int)$actor['branch_id']) aec_fail('Enrollment not found.', 404);
    $fields = [];
    $values = [];
    if (array_key_exists('status', $input)) {
        $status = (string)$input['status'];
        if (!in_array($status, ['pending', 'active', 'completed', 'cancelled'], true)) aec_fail('Invalid enrollment status.', 422);
        $fields[] = 'status = ?'; $values[] = $status;
        $fields[] = 'completed_at = ?'; $values[] = $status === 'completed' ? date('Y-m-d H:i:s') : null;
    }
    if (array_key_exists('starts_at', $input)) {
        $date = $input['starts_at'] === null || $input['starts_at'] === '' ? null : date_create((string)$input['starts_at']);
        if ($input['starts_at'] !== null && $input['starts_at'] !== '' && !$date) aec_fail('Invalid starts_at date.', 422);
        $fields[] = 'starts_at = ?'; $values[] = $date ? $date->format('Y-m-d H:i:s') : null;
    }
    if (array_key_exists('ends_at', $input)) {
        $date = $input['ends_at'] === null || $input['ends_at'] === '' ? null : date_create((string)$input['ends_at']);
        if ($input['ends_at'] !== null && $input['ends_at'] !== '' && !$date) aec_fail('Invalid ends_at date.', 422);
        $fields[] = 'ends_at = ?'; $values[] = $date ? $date->format('Y-m-d H:i:s') : null;
    }
    if (array_key_exists('notes', $input)) {
        $notes = trim((string)$input['notes']);
        if (mb_strlen($notes) > 1000) aec_fail('Notes must not exceed 1000 characters.', 422);
        $fields[] = 'notes = ?'; $values[] = $notes ?: null;
    }
    if (!$fields) aec_fail('No supported enrollment fields were supplied.', 422);
    $fields[] = 'updated_at = NOW()';
    $values[] = $id;
    $db->prepare('UPDATE course_enrollments SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
    aec_enrollment_audit($db, $actor, 'enrollment.updated', $id, ['fields' => array_keys($input)]);
    $updatedEnrollment = $db->prepare('SELECT e.user_id, e.status, c.title AS course_title FROM course_enrollments e JOIN courses c ON c.id = e.course_id WHERE e.id = ?');
    $updatedEnrollment->execute([$id]);
    $updatedRow = $updatedEnrollment->fetch();
    if ($updatedRow && isset($input['status'])) {
        $isCancelled = $updatedRow['status'] === 'cancelled';
        aec_notify_user($db, (int)$updatedRow['user_id'], (int)$actor['id'], 'Enrollment status updated', 'Your enrollment for ' . $updatedRow['course_title'] . ' is now ' . $updatedRow['status'] . '.', $isCancelled ? 'warning' : 'info', 'courses', 'এনরোলমেন্টের অবস্থা পরিবর্তন হয়েছে', $updatedRow['course_title'] . ' কোর্সে আপনার এনরোলমেন্টের অবস্থা: ' . $updatedRow['status'] . '।');
    }
    aec_ok(['id' => $id], 'Enrollment updated.');
}

aec_fail('Unknown enrollment action.', 404);
