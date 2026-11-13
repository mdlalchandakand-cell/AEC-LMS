<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_batch_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid batch id is required.', 422);
    return (int)$id;
}

function aec_batch_audit(PDO $db, array $actor, string $event, int $id, array $metadata = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'academic_batch', $id,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_batch_branch_check(PDO $db, array $actor, ?int $branchId): void {
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id']) || $branchId !== (int)$actor['branch_id']) aec_fail('Batch is outside your assigned branch.', 403);
    }
    if ($branchId !== null) {
        $stmt = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$branchId]);
        if (!$stmt->fetchColumn()) aec_fail('The batch branch is inactive or unavailable.', 403);
    }
}

function aec_batch_schedule_lock(PDO $db): string {
    $name = 'aec_batch_routine_schedule';
    $stmt = $db->prepare('SELECT GET_LOCK(?, 5)');
    $stmt->execute([$name]);
    if ((int)$stmt->fetchColumn() !== 1) aec_fail('The class schedule is being updated. Please retry shortly.', 409);
    return $name;
}

function aec_batch_schedule_unlock(PDO $db, string $name): void {
    $stmt = $db->prepare('SELECT RELEASE_LOCK(?)');
    $stmt->execute([$name]);
}

function aec_batch_time(string $value): bool {
    return (bool)preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/', $value);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $sql = "SELECT b.id, b.course_id, c.title AS course_title, b.branch_id, b.name, b.batch_code,
        b.schedule_label AS schedule, b.room_number, b.instructor_user_id AS instructor_id,
        u.name AS instructor_name, b.max_capacity,
        (SELECT COUNT(*) FROM batch_enrollments be
          JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = b.course_id
            AND ce.status IN ('active','completed')
          WHERE be.batch_id = b.id AND be.status = 'active') AS enrolled_students_count,
        b.start_date, b.end_date, b.status, b.created_at
        FROM batches b JOIN courses c ON c.id = b.course_id JOIN users u ON u.id = b.instructor_user_id
        WHERE b.deleted_at IS NULL";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        aec_assert_active_branch($db, $actor);
        $sql .= ' AND b.branch_id = ?'; $params[] = (int)$actor['branch_id'];
    } elseif (in_array($actor['role'], ['teacher','assistant_teacher'], true)) {
        $sql .= ' AND (b.instructor_user_id = ? OR EXISTS (SELECT 1 FROM batch_routine_slots r WHERE r.batch_id = b.id AND r.instructor_user_id = ? AND r.deleted_at IS NULL))';
        $params[] = (int)$actor['id']; $params[] = (int)$actor['id'];
    } elseif ($actor['role'] === 'student') {
        $sql .= " AND EXISTS (SELECT 1 FROM batch_enrollments be
            JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = b.course_id
              AND ce.status IN ('active','completed')
            WHERE be.batch_id = b.id AND be.user_id = ? AND be.status = 'active')";
        $params[] = (int)$actor['id'];
    } elseif (!in_array($actor['role'], ['admin','super_admin'], true)) {
        aec_fail('You cannot view academic batches.', 403);
    }
    $sql .= ' ORDER BY b.start_date DESC, b.name';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create' || $action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $name = trim((string)($input['name'] ?? ''));
    $code = strtoupper(trim((string)($input['batch_code'] ?? '')));
    $schedule = trim((string)($input['schedule'] ?? ''));
    $room = trim((string)($input['room_number'] ?? ''));
    $instructorId = filter_var($input['instructor_user_id'] ?? null, FILTER_VALIDATE_INT);
    $capacity = filter_var($input['max_capacity'] ?? 35, FILTER_VALIDATE_INT);
    $startDate = (string)($input['start_date'] ?? '');
    $endDate = (string)($input['end_date'] ?? '');
    if (!$courseId || $courseId < 1 || $name === '' || mb_strlen($name) > 160) aec_fail('Course and a batch name are required.', 422);
    if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{1,47}$/', $code)) aec_fail('Batch code must be 2–48 letters, numbers, hyphens or underscores.', 422);
    if (mb_strlen($schedule) > 255 || mb_strlen($room) > 120) aec_fail('Schedule or room information is too long.', 422);
    if (!$instructorId || $capacity === false || $capacity < 1 || $capacity > 1000) aec_fail('Select an instructor and a capacity from 1 to 1000.', 422);
    $dateValid = static fn(string $date): bool => (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && strtotime($date) !== false && date('Y-m-d', strtotime($date)) === $date;
    if (!$dateValid($startDate) || !$dateValid($endDate) || $endDate < $startDate) aec_fail('Valid start and end dates are required.', 422);
    $courseStmt = $db->prepare('SELECT id, branch_id, deleted_at FROM courses WHERE id = ? LIMIT 1');
    $courseStmt->execute([$courseId]); $course = $courseStmt->fetch();
    if (!$course || $course['deleted_at'] !== null) aec_fail('Course not found.', 404);
    $teacherStmt = $db->prepare("SELECT id, branch_id, role, is_active FROM users WHERE id = ? LIMIT 1");
    $teacherStmt->execute([$instructorId]); $teacher = $teacherStmt->fetch();
    if (!$teacher || !(bool)$teacher['is_active'] || !in_array($teacher['role'], ['teacher','assistant_teacher'], true)) aec_fail('Active instructor account not found.', 404);
    if ($course['branch_id'] !== null && $teacher['branch_id'] !== null && (int)$course['branch_id'] !== (int)$teacher['branch_id']) aec_fail('Course and instructor must belong to the same branch.', 403);
    if ($actor['role'] === 'branch_manager' && $teacher['branch_id'] !== null && (int)$teacher['branch_id'] !== (int)$actor['branch_id']) aec_fail('Instructor belongs to a different branch.', 403);
    $branchId = $actor['role'] === 'branch_manager'
        ? (int)$actor['branch_id']
        : ($course['branch_id'] !== null ? (int)$course['branch_id'] : ($teacher['branch_id'] !== null ? (int)$teacher['branch_id'] : null));
    if ($course['branch_id'] !== null && $branchId !== (int)$course['branch_id']) aec_fail('Course is outside the selected branch.', 403);
    aec_batch_branch_check($db, $actor, $branchId);
    $status = (string)($input['status'] ?? 'upcoming');
    if (!in_array($status, ['upcoming','ongoing','completed','cancelled'], true)) aec_fail('Invalid batch status.', 422);

    if ($action === 'create') {
        $duplicateCode = $db->prepare('SELECT id FROM batches WHERE branch_scope_id = COALESCE(?, 0) AND batch_code = ? LIMIT 1');
        $duplicateCode->execute([$branchId, $code]);
        if ($duplicateCode->fetchColumn()) aec_fail('A batch with this code already exists in this branch.', 409);
        $stmt = $db->prepare('INSERT INTO batches (course_id, branch_id, name, batch_code, schedule_label, room_number, instructor_user_id, max_capacity, start_date, end_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        try {
            $stmt->execute([$courseId, $branchId, $name, $code, $schedule ?: null, $room ?: null, $instructorId, $capacity, $startDate, $endDate, $status, (int)$actor['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') aec_fail('A batch with this code already exists in this branch.', 409);
            throw $e;
        }
        $id = (int)$db->lastInsertId();
        aec_batch_audit($db, $actor, 'batch.created', $id, ['course_id' => $courseId, 'instructor_user_id' => $instructorId]);
        aec_ok(['id' => $id], 'Batch created.', 201);
    }

    $id = aec_batch_id();
    $duplicateCode = $db->prepare('SELECT id FROM batches WHERE branch_scope_id = COALESCE(?, 0) AND batch_code = ? AND id <> ? LIMIT 1');
    $duplicateCode->execute([$branchId, $code, $id]);
    if ($duplicateCode->fetchColumn()) aec_fail('A batch with this code already exists in this branch.', 409);
    $scope = $db->prepare('SELECT branch_id, course_id FROM batches WHERE id = ? AND deleted_at IS NULL FOR UPDATE');
    $scope->execute([$id]); $existing = $scope->fetch();
    if (!$existing) aec_fail('Batch not found.', 404);
    aec_batch_branch_check($db, $actor, $existing['branch_id'] === null ? null : (int)$existing['branch_id']);
    $newBranchId = $branchId;
    $oldBranchId = $existing['branch_id'] === null ? null : (int)$existing['branch_id'];
    if ((int)$existing['course_id'] !== (int)$courseId || $oldBranchId !== $newBranchId) {
        $activeRoster = $db->prepare("SELECT COUNT(*) FROM batch_enrollments be JOIN batches b ON b.id = be.batch_id JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = b.course_id AND ce.status IN ('active','completed') WHERE be.batch_id = ? AND be.status = 'active'");
        $activeRoster->execute([$id]);
        if ((int)$activeRoster->fetchColumn() > 0) aec_fail('Unenroll all active students before changing a batch course or branch.', 409);
    }
    $stmt = $db->prepare('UPDATE batches SET course_id = ?, branch_id = ?, name = ?, batch_code = ?, schedule_label = ?, room_number = ?, instructor_user_id = ?, max_capacity = ?, start_date = ?, end_date = ?, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
    try {
        $stmt->execute([$courseId, $branchId, $name, $code, $schedule ?: null, $room ?: null, $instructorId, $capacity, $startDate, $endDate, $status, $id]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('A batch with this code already exists in this branch.', 409);
        throw $e;
    }
    aec_batch_audit($db, $actor, 'batch.updated', $id);
    aec_ok(['id' => $id], 'Batch updated.');
}

if ($action === 'delete' || $action === 'restore') {
    aec_method(['POST']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_batch_id();
    $stmt = $db->prepare('SELECT branch_id FROM batches WHERE id = ? LIMIT 1');
    $stmt->execute([$id]); $batch = $stmt->fetch();
    if (!$batch) aec_fail('Batch not found.', 404);
    aec_batch_branch_check($db, $actor, $batch['branch_id'] === null ? null : (int)$batch['branch_id']);
    if ($action === 'delete') {
        $db->prepare('UPDATE batches SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL')->execute([$id]);
        aec_batch_audit($db, $actor, 'batch.deleted', $id);
        aec_ok(['id' => $id], 'Batch moved to recycle bin.');
    }
    $duplicate = $db->prepare('SELECT id FROM batches WHERE branch_scope_id = COALESCE(?, 0) AND batch_code = (SELECT batch_code FROM batches WHERE id = ?) AND id <> ? LIMIT 1');
    $duplicate->execute([$batch['branch_id'], $id, $id]);
    if ($duplicate->fetchColumn()) aec_fail('Another batch already uses this code in the branch; rename it before restoring.', 409);
    $db->prepare('UPDATE batches SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL')->execute([$id]);
    aec_batch_audit($db, $actor, 'batch.restored', $id);
    aec_ok(['id' => $id], 'Batch restored.');
}

if ($action === 'enroll' || $action === 'unenroll') {
    aec_method(['POST']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $batchId = aec_batch_id();
    $input = aec_input();
    $studentId = filter_var($input['student_user_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$studentId || $studentId < 1) aec_fail('A valid student_user_id is required.', 422);
    $db->beginTransaction();
    try {
        $batchStmt = $db->prepare('SELECT * FROM batches WHERE id = ? AND deleted_at IS NULL FOR UPDATE');
        $batchStmt->execute([$batchId]); $batch = $batchStmt->fetch();
        if (!$batch) aec_fail('Batch not found.', 404);
        aec_batch_branch_check($db, $actor, $batch['branch_id'] === null ? null : (int)$batch['branch_id']);
        $studentStmt = $db->prepare("SELECT id, branch_id, role, is_active FROM users WHERE id = ? LIMIT 1");
        $studentStmt->execute([$studentId]); $student = $studentStmt->fetch();
        if (!$student || !(bool)$student['is_active'] || $student['role'] !== 'student') aec_fail('Active student account not found.', 404);
        if ($batch['branch_id'] !== null && (int)($student['branch_id'] ?? 0) !== (int)$batch['branch_id']) aec_fail('Student belongs to a different branch.', 403);
        if ($action === 'unenroll') {
            $db->prepare("UPDATE batch_enrollments SET status = 'cancelled', updated_at = NOW() WHERE batch_id = ? AND user_id = ? AND status = 'active'")->execute([$batchId, $studentId]);
            aec_batch_audit($db, $actor, 'batch.student_removed', $batchId, ['student_user_id' => $studentId]);
            $db->commit(); aec_ok(['batch_id' => $batchId, 'student_user_id' => $studentId], 'Student removed from batch.');
        }
        $courseEnrollment = $db->prepare("SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ? AND status IN ('active','completed') LIMIT 1");
        $courseEnrollment->execute([$studentId, (int)$batch['course_id']]);
        if (!$courseEnrollment->fetchColumn()) aec_fail('Student must have an active course enrollment before joining this batch.', 409);
        $existingEnrollment = $db->prepare('SELECT status FROM batch_enrollments WHERE batch_id = ? AND user_id = ? FOR UPDATE');
        $existingEnrollment->execute([$batchId, $studentId]);
        $existingStatus = $existingEnrollment->fetchColumn();
        if ($existingStatus !== 'active') {
            $count = $db->prepare("SELECT COUNT(*) FROM batch_enrollments be
                JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = ?
                  AND ce.status IN ('active','completed')
                WHERE be.batch_id = ? AND be.status = 'active'");
            $count->execute([(int)$batch['course_id'], $batchId]);
            if ((int)$count->fetchColumn() >= (int)$batch['max_capacity']) aec_fail('Batch capacity has been reached.', 409);
        }
        $db->prepare("INSERT INTO batch_enrollments (batch_id, user_id, branch_id, status, enrolled_by) VALUES (?, ?, ?, 'active', ?) ON DUPLICATE KEY UPDATE status = 'active', enrolled_by = VALUES(enrolled_by), enrolled_at = NOW(), updated_at = NOW()")
            ->execute([$batchId, $studentId, $batch['branch_id'], (int)$actor['id']]);
        aec_batch_audit($db, $actor, 'batch.student_enrolled', $batchId, ['student_user_id' => $studentId]);
        $db->commit(); aec_ok(['batch_id' => $batchId, 'student_user_id' => $studentId], 'Student added to batch.', 201);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

if ($action === 'instructors') {
    aec_method(['GET']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    $sql = "SELECT id, name, email, role, branch_id FROM users
        WHERE is_active = 1 AND role IN ('teacher','assistant_teacher')";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        $sql .= ' AND (branch_id = ? OR branch_id IS NULL)';
        $params[] = (int)$actor['branch_id'];
    }
    $sql .= ' ORDER BY name';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'eligible_students') {
    aec_method(['GET']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    $batchId = filter_input(INPUT_GET, 'batch_id', FILTER_VALIDATE_INT);
    if (!$batchId || $batchId < 1) aec_fail('A valid batch_id is required.', 422);
    $batchStmt = $db->prepare('SELECT course_id, branch_id FROM batches WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $batchStmt->execute([$batchId]); $batch = $batchStmt->fetch();
    if (!$batch) aec_fail('Batch not found.', 404);
    aec_batch_branch_check($db, $actor, $batch['branch_id'] === null ? null : (int)$batch['branch_id']);
    $sql = "SELECT u.id, u.name, u.email, u.phone
        FROM users u
        JOIN course_enrollments ce ON ce.user_id = u.id AND ce.course_id = ?
          AND ce.status IN ('active','completed')
        LEFT JOIN batch_enrollments be ON be.batch_id = ? AND be.user_id = u.id AND be.status = 'active'
        WHERE u.role = 'student' AND u.is_active = 1 AND be.id IS NULL";
    $params = [(int)$batch['course_id'], $batchId];
    if ($batch['branch_id'] !== null) { $sql .= ' AND u.branch_id = ?'; $params[] = (int)$batch['branch_id']; }
    $sql .= ' ORDER BY u.name';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'students') {
    aec_method(['GET']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    $batchId = filter_input(INPUT_GET, 'batch_id', FILTER_VALIDATE_INT);
    if (!$batchId || $batchId < 1) aec_fail('A valid batch_id is required.', 422);
    $stmt = $db->prepare("SELECT be.id, be.user_id, u.name, u.email, u.phone, be.status, be.enrolled_at
        FROM batch_enrollments be JOIN users u ON u.id = be.user_id
        JOIN batches b ON b.id = be.batch_id
        JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = b.course_id
          AND ce.status IN ('active','completed')
        WHERE be.batch_id = ? AND b.deleted_at IS NULL AND be.status = 'active'" . ($actor['role'] === 'branch_manager' ? ' AND b.branch_id = ?' : '') . " ORDER BY u.name");
    $stmt->execute($actor['role'] === 'branch_manager' ? [$batchId, (int)$actor['branch_id']] : [$batchId]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'routines') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $sql = "SELECT r.id, r.batch_id, b.name AS batch_name, c.title AS course_title, r.day_of_week,
        r.start_time, r.end_time, r.subject, r.instructor_user_id, u.name AS instructor_name, r.room_number, r.branch_id
        FROM batch_routine_slots r JOIN batches b ON b.id = r.batch_id JOIN courses c ON c.id = b.course_id
        JOIN users u ON u.id = r.instructor_user_id
        WHERE r.deleted_at IS NULL AND b.deleted_at IS NULL";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        aec_assert_active_branch($db, $actor); $sql .= ' AND r.branch_id = ?'; $params[] = (int)$actor['branch_id'];
    } elseif (in_array($actor['role'], ['teacher','assistant_teacher'], true)) {
        $sql .= ' AND (r.instructor_user_id = ? OR b.instructor_user_id = ?)'; $params[] = (int)$actor['id']; $params[] = (int)$actor['id'];
    } elseif ($actor['role'] === 'student') {
        $sql .= " AND EXISTS (SELECT 1 FROM batch_enrollments be
            JOIN course_enrollments ce ON ce.user_id = be.user_id AND ce.course_id = b.course_id
              AND ce.status IN ('active','completed')
            WHERE be.batch_id = b.id AND be.user_id = ? AND be.status = 'active')"; $params[] = (int)$actor['id'];
    } elseif (!in_array($actor['role'], ['admin','super_admin'], true)) aec_fail('You cannot view class routines.', 403);
    $batchId = filter_input(INPUT_GET, 'batch_id', FILTER_VALIDATE_INT);
    if ($batchId && $batchId > 0) { $sql .= ' AND r.batch_id = ?'; $params[] = $batchId; }
    $sql .= ' ORDER BY FIELD(r.day_of_week, "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"), r.start_time';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create_routine') {
    aec_method(['POST']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $batchId = filter_var($input['batch_id'] ?? null, FILTER_VALIDATE_INT);
    $day = (string)($input['day_of_week'] ?? '');
    $start = (string)($input['start_time'] ?? '');
    $end = (string)($input['end_time'] ?? '');
    $subject = trim((string)($input['subject'] ?? ''));
    $room = trim((string)($input['room_number'] ?? ''));
    $instructorId = filter_var($input['instructor_user_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$batchId || !in_array($day, ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], true)
        || !aec_batch_time($start) || !aec_batch_time($end) || $end <= $start
        || $subject === '' || mb_strlen($subject) > 180 || mb_strlen($room) > 120) aec_fail('Valid batch, day, time range, subject and room are required.', 422);
    $scheduleLock = aec_batch_schedule_lock($db);
    $db->beginTransaction();
    try {
        $batchStmt = $db->prepare('SELECT * FROM batches WHERE id = ? AND deleted_at IS NULL FOR UPDATE');
        $batchStmt->execute([$batchId]); $batch = $batchStmt->fetch();
        if (!$batch) aec_fail('Batch not found.', 404);
        aec_batch_branch_check($db, $actor, $batch['branch_id'] === null ? null : (int)$batch['branch_id']);
        $instructorId = $instructorId ?: (int)$batch['instructor_user_id'];
        $teacherStmt = $db->prepare("SELECT id, role, branch_id, is_active FROM users WHERE id = ? LIMIT 1");
        $teacherStmt->execute([$instructorId]); $teacher = $teacherStmt->fetch();
        if (!$teacher || !(bool)$teacher['is_active'] || !in_array($teacher['role'], ['teacher','assistant_teacher'], true)) aec_fail('Active instructor account not found.', 404);
        if ($batch['branch_id'] !== null && $teacher['branch_id'] !== null && (int)$teacher['branch_id'] !== (int)$batch['branch_id']) aec_fail('Instructor belongs to a different branch.', 403);
        $overlap = $db->prepare("SELECT r.id FROM batch_routine_slots r
            WHERE (r.branch_id IS NULL OR r.branch_id <=> ? OR ? IS NULL)
              AND r.day_of_week = ? AND r.deleted_at IS NULL
              AND r.start_time < ? AND r.end_time > ?
              AND (r.instructor_user_id = ? OR (? <> '' AND r.room_number = ?))
            LIMIT 1");
        $overlap->execute([$batch['branch_id'], $batch['branch_id'], $day, $end, $start, $instructorId, $room, $room]);
        if ($overlap->fetchColumn()) aec_fail('The instructor or room already has a class during this time.', 409);
        $stmt = $db->prepare('INSERT INTO batch_routine_slots (batch_id, branch_id, day_of_week, start_time, end_time, subject, instructor_user_id, room_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$batchId, $batch['branch_id'], $day, $start . ':00', $end . ':00', $subject, $instructorId, $room ?: null, (int)$actor['id']]);
        $id = (int)$db->lastInsertId();
        aec_batch_audit($db, $actor, 'batch.routine_created', $id, ['batch_id' => $batchId, 'day' => $day, 'start_time' => $start, 'end_time' => $end]);
        $db->commit();
        aec_batch_schedule_unlock($db, $scheduleLock);
        aec_ok(['id' => $id], 'Routine slot created.', 201);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        aec_batch_schedule_unlock($db, $scheduleLock);
        throw $e;
    }
}

if ($action === 'delete_routine') {
    aec_method(['POST']);
    $actor = aec_require_permission('batches.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid routine id is required.', 422);
    $sql = 'SELECT branch_id FROM batch_routine_slots WHERE id = ? AND deleted_at IS NULL';
    $stmt = $db->prepare($sql); $stmt->execute([$id]); $routine = $stmt->fetch();
    if (!$routine) aec_fail('Routine slot not found.', 404);
    aec_batch_branch_check($db, $actor, $routine['branch_id'] === null ? null : (int)$routine['branch_id']);
    $db->prepare('UPDATE batch_routine_slots SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?')->execute([$id]);
    aec_batch_audit($db, $actor, 'batch.routine_deleted', $id);
    aec_ok(['id' => $id], 'Routine slot removed.');
}

aec_fail('Unknown batch action.', 404);
