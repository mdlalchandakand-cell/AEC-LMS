<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_certificate_row(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'certificateNumber' => $row['certificate_number'],
        'studentUserId' => (int)$row['student_user_id'],
        'studentId' => $row['student_id_snapshot'],
        'studentName' => $row['student_name_snapshot'],
        'courseId' => (int)$row['course_id'],
        'courseTitle' => $row['course_title_snapshot'],
        'completionDate' => $row['completion_date'],
        'grade' => $row['grade'],
        'issueDate' => $row['issued_at'],
        'authorizedBy' => $row['authorized_by'],
        'status' => $row['status'],
        'revokedAt' => $row['revoked_at'],
        'revokeReason' => $row['revoke_reason'],
    ];
}

function aec_certificate_audit(PDO $db, array $actor, string $action, int $certificateId, array $metadata = []): void
{
    $stmt = $db->prepare(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        (int)$actor['id'], $action, 'certificate', $certificateId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_certificate_select(): string
{
    return 'SELECT id, certificate_number, student_user_id, course_id, branch_id, student_id_snapshot,
                   student_name_snapshot, course_title_snapshot, completion_date, grade,
                   authorized_by, status, issued_by, issued_at, revoked_by, revoked_at, revoke_reason
            FROM certificates';
}

/* Public lookup exposes only public credential fields, never account identifiers. */
if ($action === 'verify') {
    aec_method(['GET']);
    $number = strtoupper(trim((string)($_GET['cert_no'] ?? '')));
    if ($number === '' || strlen($number) > 60 || !preg_match('/^AEC-CERT-\d{4}-[A-F0-9]{32}$/', $number)) {
        aec_fail('Enter a valid certificate number.', 422);
    }
    $stmt = $db->prepare(
        'SELECT certificate_number, student_name_snapshot, course_title_snapshot,
                completion_date, grade, authorized_by, status, issued_at, revoked_at
         FROM certificates WHERE certificate_number = ? LIMIT 1'
    );
    $stmt->execute([$number]);
    $row = $stmt->fetch();
    if (!$row) aec_fail('No certificate record was found.', 404);
    aec_ok([
        'certificateNumber' => $row['certificate_number'],
        'studentName' => $row['student_name_snapshot'],
        'courseTitle' => $row['course_title_snapshot'],
        'completionDate' => $row['completion_date'],
        'grade' => $row['grade'],
        'authorizedBy' => $row['authorized_by'],
        'issueDate' => $row['issued_at'],
        'status' => $row['status'],
        'valid' => $row['status'] === 'issued',
        'revokedAt' => $row['revoked_at'],
    ]);
}

if ($action === 'my') {
    aec_method(['GET']);
    $user = aec_current_user();
    if ($user['role'] !== 'student') aec_fail('Student account required.', 403);
    $stmt = $db->prepare(aec_certificate_select() . ' WHERE student_user_id = ? ORDER BY issued_at DESC, id DESC LIMIT 200');
    $stmt->execute([(int)$user['id']]);
    aec_ok(array_map('aec_certificate_row', $stmt->fetchAll()));
}

if ($action === 'students') {
    aec_method(['GET']);
    $actor = aec_require_permission('certificates.manage');
    aec_assert_active_branch($db, $actor);
    $search = trim((string)($_GET['q'] ?? ''));
    $sql = "SELECT id, name, email FROM users WHERE role = 'student' AND is_active = 1";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' AND branch_id = ?';
        $params[] = (int)$actor['branch_id'];
    }
    if ($search !== '') {
        $sql .= ' AND (name LIKE ? OR email LIKE ?)';
        $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
        $params[] = $term;
        $params[] = $term;
    }
    $sql .= ' ORDER BY name ASC, id ASC LIMIT 100';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) $row['id'] = (int)$row['id'];
    unset($row);
    aec_ok($rows);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('certificates.manage');
    aec_assert_active_branch($db, $actor);
    $search = trim((string)($_GET['q'] ?? ''));
    $sql = aec_certificate_select();
    $where = [];
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $where[] = 'branch_id = ?';
        $params[] = (int)$actor['branch_id'];
    }
    if ($search !== '') {
        $where[] = '(certificate_number LIKE ? OR student_name_snapshot LIKE ? OR course_title_snapshot LIKE ?)';
        $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
        array_push($params, $term, $term, $term);
    }
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY issued_at DESC, id DESC LIMIT 500';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok(array_map('aec_certificate_row', $stmt->fetchAll()));
}

if ($action === 'issue') {
    aec_method(['POST']);
    $actor = aec_require_permission('certificates.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $studentId = filter_var($input['student_user_id'] ?? null, FILTER_VALIDATE_INT);
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $grade = trim((string)($input['grade'] ?? 'Completed'));
    if (!$studentId || $studentId < 1 || !$courseId || $courseId < 1) {
        aec_fail('A valid student and course are required.', 422);
    }
    if ($grade === '' || mb_strlen($grade) > 100) aec_fail('Grade is required and must not exceed 100 characters.', 422);

    $db->beginTransaction();
    try {
        $studentStmt = $db->prepare("SELECT id, name, role, branch_id, is_active FROM users WHERE id = ? LIMIT 1 FOR UPDATE");
        $studentStmt->execute([$studentId]);
        $student = $studentStmt->fetch();
        if (!$student || $student['role'] !== 'student' || !(bool)$student['is_active']) {
            aec_fail('An active student account is required.', 422);
        }

        $courseStmt = $db->prepare("SELECT id, title, status, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE");
        $courseStmt->execute([$courseId]);
        $course = $courseStmt->fetch();
        if (!$course) aec_fail('Course not found.', 404);

        $enrollmentStmt = $db->prepare(
            "SELECT id, status, completed_at, branch_id FROM course_enrollments
             WHERE user_id = ? AND course_id = ? AND status IN ('active','completed')
             LIMIT 1 FOR UPDATE"
        );
        $enrollmentStmt->execute([$studentId, $courseId]);
        $enrollment = $enrollmentStmt->fetch();
        if (!$enrollment) aec_fail('The student must be enrolled in this course before a certificate can be issued.', 409);
        if ($actor['role'] === 'branch_manager') {
            if ((int)$student['branch_id'] !== (int)$actor['branch_id']
                || (int)$course['branch_id'] !== (int)$actor['branch_id']
                || (int)$enrollment['branch_id'] !== (int)$actor['branch_id']) {
                aec_fail('Student, course and enrollment must belong to your assigned branch.', 403);
            }
        }
        $certificateBranchId = $enrollment['branch_id'] !== null ? (int)$enrollment['branch_id'] : ($course['branch_id'] !== null ? (int)$course['branch_id'] : null);

        $progressStmt = $db->prepare(
            "SELECT COUNT(*) AS total_items,
                    SUM(CASE WHEN clp.is_completed = 1 THEN 1 ELSE 0 END) AS completed_items,
                    MAX(clp.updated_at) AS last_completed_at
             FROM course_content cc
             INNER JOIN content_items ci ON ci.id = cc.content_item_id AND ci.deleted_at IS NULL AND ci.status = 'published'
             LEFT JOIN course_lesson_progress clp
               ON clp.course_id = cc.course_id AND clp.content_item_id = cc.content_item_id AND clp.user_id = ?
             WHERE cc.course_id = ?"
        );
        $progressStmt->execute([$studentId, $courseId]);
        $progress = $progressStmt->fetch();
        $totalItems = (int)($progress['total_items'] ?? 0);
        $completedItems = (int)($progress['completed_items'] ?? 0);
        $hasCompletedCourse = $enrollment['status'] === 'completed'
            || ($totalItems > 0 && $completedItems === $totalItems);
        if (!$hasCompletedCourse) {
            aec_fail('Course completion is required. Mark the enrollment completed or ensure every course lesson is completed.', 409);
        }

        $existing = $db->prepare('SELECT id FROM certificates WHERE student_user_id = ? AND course_id = ? LIMIT 1');
        $existing->execute([$studentId, $courseId]);
        if ($existing->fetch()) aec_fail('A certificate already exists for this student and course.', 409);

        $certificateNumber = sprintf('AEC-CERT-%s-%s', date('Y'), strtoupper(bin2hex(random_bytes(16))));
        $studentCode = sprintf('AEC-%s-%06d', date('Y'), (int)$student['id']);
        $completionDate = $enrollment['completed_at']
            ? substr((string)$enrollment['completed_at'], 0, 10)
            : (string)($progress['last_completed_at'] ? substr((string)$progress['last_completed_at'], 0, 10) : date('Y-m-d'));

        $insert = $db->prepare(
            "INSERT INTO certificates
             (certificate_number, student_user_id, course_id, branch_id, student_id_snapshot, student_name_snapshot,
              course_title_snapshot, completion_date, grade, authorized_by, status, issued_by, issued_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, NOW())"
        );
        $insert->execute([
            $certificateNumber, (int)$student['id'], (int)$course['id'], $certificateBranchId, $studentCode,
            $student['name'], $course['title'], $completionDate, $grade, $actor['name'], (int)$actor['id'],
        ]);
        $certificateId = (int)$db->lastInsertId();
        aec_certificate_audit($db, $actor, 'certificate.issued', $certificateId, [
            'certificate_number' => $certificateNumber, 'student_user_id' => (int)$student['id'], 'course_id' => (int)$course['id'],
        ]);
        aec_notify_user($db, (int)$student['id'], (int)$actor['id'], 'Certificate issued', 'Your certificate for ' . $course['title'] . ' is ready. Certificate number: ' . $certificateNumber . '.', 'success', 'certificates');
        $db->commit();
        aec_ok(['id' => $certificateId, 'certificate_number' => $certificateNumber], 'Certificate issued.', 201);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'revoke') {
    aec_method(['POST']);
    $actor = aec_require_permission('certificates.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid certificate identifier is required.', 422);
    $input = aec_input();
    $reason = trim((string)($input['reason'] ?? ''));
    if ($reason === '' || mb_strlen($reason) > 500) aec_fail('A revocation reason is required and must not exceed 500 characters.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT id, status, branch_id, certificate_number, student_user_id, course_title_snapshot FROM certificates WHERE id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$id]);
        $certificate = $stmt->fetch();
        if (!$certificate) aec_fail('Certificate not found.', 404);
        if ($actor['role'] === 'branch_manager' && (int)$certificate['branch_id'] !== (int)$actor['branch_id']) aec_fail('Certificate not found.', 404);
        if ($certificate['status'] === 'revoked') aec_fail('Certificate has already been revoked.', 409);
        $db->prepare("UPDATE certificates SET status = 'revoked', revoked_by = ?, revoked_at = NOW(), revoke_reason = ? WHERE id = ?")
            ->execute([(int)$actor['id'], $reason, (int)$id]);
        aec_certificate_audit($db, $actor, 'certificate.revoked', (int)$id, [
            'certificate_number' => $certificate['certificate_number'], 'reason' => $reason,
        ]);
        aec_notify_user($db, (int)$certificate['student_user_id'], (int)$actor['id'], 'Certificate revoked', 'Your certificate for ' . $certificate['course_title_snapshot'] . ' has been revoked. Reason: ' . $reason . '.', 'warning', 'certificates');
        $db->commit();
        aec_ok(['id' => (int)$id, 'status' => 'revoked'], 'Certificate revoked.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

aec_fail('Unknown certificate action.', 404);
