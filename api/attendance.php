<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'list';

function aec_attendance_date(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        aec_fail('Attendance date must use YYYY-MM-DD format.', 422);
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        aec_fail('Attendance date is invalid.', 422);
    }
    return $date->format('Y-m-d');
}

function aec_attendance_course(PDO $db, int $courseId): array
{
    $stmt = $db->prepare("SELECT id, title, status, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
    if (!$course) aec_fail('Course not found.', 404);
    if ($course['status'] !== 'published') aec_fail('Attendance can only be recorded for a published course.', 409);
    return $course;
}

if ($action === 'my') {
    aec_method(['GET']);
    $user = aec_current_user();
    $stmt = $db->prepare(
        'SELECT ar.id, ar.course_id, c.title AS course_title, ar.attendance_date,
                ar.status, ar.remarks, ar.created_at, ar.updated_at
         FROM attendance_records ar
         INNER JOIN courses c ON c.id = ar.course_id
         WHERE ar.user_id = ? ORDER BY ar.attendance_date DESC, ar.id DESC LIMIT 500'
    );
    $stmt->execute([(int)$user['id']]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'roster') {
    aec_method(['GET']);
    $actor = aec_require_permission('attendance.manage');
    aec_assert_active_branch($db, $actor);
    if ($actor['role'] === 'branch_manager' && empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
    $courseId = filter_input(INPUT_GET, 'course_id', FILTER_VALIDATE_INT);
    if (!$courseId || $courseId < 1) aec_fail('A valid course identifier is required.', 422);
    $date = aec_attendance_date($_GET['date'] ?? '');
    $course = aec_attendance_course($db, $courseId);
    if ($actor['role'] === 'branch_manager' && (int)$course['branch_id'] !== (int)$actor['branch_id']) aec_fail('Course not found.', 404);
    $sql = "SELECT u.id, u.name, u.email, ce.branch_id,
                ar.status, ar.remarks
         FROM course_enrollments ce
         INNER JOIN users u ON u.id = ce.user_id
         LEFT JOIN attendance_records ar
           ON ar.course_id = ce.course_id AND ar.user_id = ce.user_id AND ar.attendance_date = ?
         WHERE ce.course_id = ? AND ce.status IN ('active','completed')
           AND u.role = 'student' AND u.is_active = 1";
    $params = [$date, $courseId];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND ce.branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $sql .= ' ORDER BY u.name ASC, u.id ASC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['id'] = (int)$row['id'];
        $row['branch_id'] = $row['branch_id'] === null ? null : (int)$row['branch_id'];
    }
    unset($row);
    aec_ok($rows);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('attendance.manage');
    aec_assert_active_branch($db, $actor);
    if ($actor['role'] === 'branch_manager' && empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
    $courseId = null;
    if (isset($_GET['course_id'])) {
        $courseId = filter_var($_GET['course_id'], FILTER_VALIDATE_INT);
        if (!$courseId || $courseId < 1) aec_fail('A valid course identifier is required.', 422);
    }
    $date = isset($_GET['date']) ? aec_attendance_date($_GET['date']) : date('Y-m-d');
    $sql = 'SELECT ar.id, ar.course_id, c.title AS course_title, ar.user_id,
                   u.name AS student_name, u.email, ar.attendance_date, ar.status,
                   ar.remarks, ar.marked_by, marker.name AS marked_by_name, ar.created_at
            FROM attendance_records ar
            INNER JOIN courses c ON c.id = ar.course_id
            INNER JOIN users u ON u.id = ar.user_id
            INNER JOIN users marker ON marker.id = ar.marked_by
            WHERE ar.attendance_date = ?';
    $params = [$date];
    if ($actor['role'] === 'branch_manager') {
        $sql .= ' AND ar.branch_id = ?';
        $params[] = (int)$actor['branch_id'];
    }
    if ($courseId) {
        $sql .= ' AND ar.course_id = ?';
        $params[] = $courseId;
    }
    $sql .= ' ORDER BY c.title ASC, u.name ASC LIMIT 1000';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'save') {
    aec_method(['POST']);
    $actor = aec_require_permission('attendance.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $date = aec_attendance_date($input['attendance_date'] ?? null);
    $records = $input['records'] ?? null;
    if (!$courseId || $courseId < 1 || !is_array($records) || count($records) < 1 || count($records) > 500) {
        aec_fail('A course and between 1 and 500 attendance records are required.', 422);
    }

    $normalized = [];
    $seen = [];
    $validStatuses = ['present', 'absent', 'late', 'excused'];
    foreach ($records as $record) {
        if (!is_array($record)) aec_fail('Each attendance record must be an object.', 422);
        $userId = filter_var($record['user_id'] ?? null, FILTER_VALIDATE_INT);
        $status = $record['status'] ?? null;
        $remarks = $record['remarks'] ?? '';
        if (!$userId || $userId < 1 || isset($seen[$userId]) || !is_string($status) || !in_array($status, $validStatuses, true) || !is_string($remarks) || mb_strlen($remarks) > 1000) {
            aec_fail('Attendance records contain an invalid student, duplicate, status or remark.', 422);
        }
        $seen[$userId] = true;
        $normalized[] = [(int)$userId, $status, trim($remarks) ?: null];
    }

    $db->beginTransaction();
    try {
        $courseLock = $db->prepare("SELECT id, status, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE");
        $courseLock->execute([$courseId]);
        $course = $courseLock->fetch();
        if (!$course) aec_fail('Course not found.', 404);
        if ($course['status'] !== 'published') aec_fail('Attendance can only be recorded for a published course.', 409);
        if ($actor['role'] === 'branch_manager' && (int)$course['branch_id'] !== (int)$actor['branch_id']) aec_fail('Course not found.', 404);
        $branchId = $course['branch_id'] !== null ? (int)$course['branch_id'] : null;

        $userIds = array_column($normalized, 0);
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $roster = $db->prepare(
            "SELECT ce.user_id FROM course_enrollments ce
             INNER JOIN users u ON u.id = ce.user_id
             WHERE ce.course_id = ? AND ce.status IN ('active','completed')
               AND u.role = 'student' AND u.is_active = 1
               AND ce.user_id IN ({$placeholders})" . ($actor['role'] === 'branch_manager' ? " AND ce.branch_id = " . (int)$actor['branch_id'] : '')
        );
        $roster->execute([$courseId, ...$userIds]);
        $eligible = array_map('intval', array_column($roster->fetchAll(), 'user_id'));
        if (count($eligible) !== count($userIds)) {
            aec_fail('Only active students enrolled in this course can receive attendance records.', 422);
        }

        $upsert = $db->prepare(
            'INSERT INTO attendance_records (course_id, branch_id, user_id, attendance_date, status, remarks, marked_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE branch_id = VALUES(branch_id), status = VALUES(status), remarks = VALUES(remarks),
               marked_by = VALUES(marked_by), updated_at = NOW()'
        );
        foreach ($normalized as [$userId, $status, $remarks]) {
            $upsert->execute([$courseId, $branchId, $userId, $date, $status, $remarks, (int)$actor['id']]);
        }
        $audit = $db->prepare(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $audit->execute([
            (int)$actor['id'], 'attendance.saved', 'course', $courseId,
            substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
            json_encode(['attendance_date' => $date, 'record_count' => count($normalized)], JSON_UNESCAPED_UNICODE),
        ]);
        $db->commit();
        aec_ok(['course_id' => $courseId, 'attendance_date' => $date, 'saved_count' => count($normalized)], 'Attendance saved.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

aec_fail('Unknown attendance action.', 404);
