<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'my_students');

function aec_guardian_link_id(): int
{
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid guardian link id is required.', 422);
    return (int)$id;
}

function aec_guardian_same_branch(array $guardian, array $student): void
{
    $guardianBranch = $guardian['branch_id'] === null ? null : (int)$guardian['branch_id'];
    $studentBranch = $student['branch_id'] === null ? null : (int)$student['branch_id'];
    if ($guardianBranch !== $studentBranch) aec_fail('Guardian and student must belong to the same branch.', 403);
    if ($guardianBranch !== null) {
        $stmt = aec_db()->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$guardianBranch]);
        if (!$stmt->fetchColumn()) aec_fail('The assigned branch is inactive.', 403);
    }
}

function aec_guardian_audit(PDO $db, array $actor, string $event, int $linkId, array $metadata = []): void
{
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'guardian_student_link', $linkId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

if ($action === 'my_students') {
    aec_method(['GET']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'guardian') aec_fail('Only guardian accounts can view linked students.', 403);
    $stmt = $db->prepare("SELECT l.id AS link_id, l.relationship, l.status, l.requested_at, l.reviewed_at,
        u.id AS student_user_id, u.name AS student_name, u.email AS student_email, CASE WHEN l.status = 'active' THEN u.phone ELSE NULL END AS student_phone,
        u.branch_id
        FROM guardian_student_links l
        JOIN users u ON u.id = l.student_user_id
        WHERE l.guardian_user_id = ? AND l.status IN ('pending','active')
          AND u.branch_id <=> ?
          AND (u.branch_id IS NULL OR EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id AND b.is_active = 1))
        ORDER BY l.requested_at DESC");
    $stmt->execute([(int)$actor['id'], $actor['branch_id'] === null ? null : (int)$actor['branch_id']]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'request') {
    aec_method(['POST']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'guardian') aec_fail('Only guardian accounts can request a student link.', 403);
    aec_csrf_check();
    $input = aec_input();
    $email = mb_strtolower(trim((string)($input['student_email'] ?? '')));
    $relationship = trim((string)($input['relationship'] ?? 'Guardian'));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) aec_fail('Enter the student account email address.', 422);
    if ($relationship === '' || mb_strlen($relationship) > 60) aec_fail('Relationship must be between 1 and 60 characters.', 422);

    $requestIp = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: 'unknown';
    $rateStmt = $db->prepare("SELECT COUNT(*) FROM account_action_attempts WHERE action = 'guardian_link' AND email = ? AND ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
    $rateStmt->execute([$email, $requestIp]);
    if ((int)$rateStmt->fetchColumn() >= 5) aec_fail('Too many guardian-link requests. Try again later.', 429);
    $db->prepare("INSERT INTO account_action_attempts (action, email, ip_address) VALUES ('guardian_link', ?, ?)")->execute([$email, $requestIp]);

    $studentStmt = $db->prepare("SELECT id, name, email, role, branch_id, is_active FROM users WHERE email = ? AND role = 'student' LIMIT 1");
    $studentStmt->execute([$email]);
    $student = $studentStmt->fetch();
    if (!$student || !(bool)$student['is_active']) aec_fail('An active student account with that email was not found.', 404);
    aec_guardian_same_branch($actor, $student);

    $existingStmt = $db->prepare('SELECT id, status FROM guardian_student_links WHERE guardian_user_id = ? AND student_user_id = ? LIMIT 1');
    $existingStmt->execute([(int)$actor['id'], (int)$student['id']]);
    $existing = $existingStmt->fetch();
    if ($existing && in_array($existing['status'], ['pending','active'], true)) aec_fail('A link request already exists for this student.', 409);

    if ($existing) {
        $db->prepare("UPDATE guardian_student_links SET relationship = ?, status = 'pending', requested_by = ?, reviewed_by = NULL, requested_at = NOW(), reviewed_at = NULL, updated_at = NOW() WHERE id = ?")
            ->execute([$relationship, (int)$actor['id'], (int)$existing['id']]);
        $linkId = (int)$existing['id'];
    } else {
        $stmt = $db->prepare("INSERT INTO guardian_student_links (guardian_user_id, student_user_id, relationship, status, requested_by) VALUES (?, ?, ?, 'pending', ?)");
        $stmt->execute([(int)$actor['id'], (int)$student['id'], $relationship, (int)$actor['id']]);
        $linkId = (int)$db->lastInsertId();
    }
    aec_notify_user($db, (int)$student['id'], (int)$actor['id'], 'Guardian link request', $actor['name'] . ' requested access to your learning progress.', 'info', 'guardian_links', 'অভিভাবক সংযোগের অনুরোধ', $actor['name'] . ' আপনার শেখার অগ্রগতি দেখার জন্য সংযোগের অনুরোধ করেছেন।');
    aec_guardian_audit($db, $actor, 'guardian_link.requested', $linkId, ['student_user_id' => (int)$student['id']]);
    aec_ok(['id' => $linkId, 'status' => 'pending'], 'Request sent. The student must accept it before any records are shared.', 201);
}

if ($action === 'incoming') {
    aec_method(['GET']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'student') aec_fail('Only students can view incoming guardian requests.', 403);
    $stmt = $db->prepare("SELECT l.id, l.relationship, l.requested_at, u.id AS guardian_user_id, u.name AS guardian_name, u.email AS guardian_email, u.phone AS guardian_phone
        FROM guardian_student_links l
        JOIN users u ON u.id = l.guardian_user_id
        WHERE l.student_user_id = ? AND l.status = 'pending'
        ORDER BY l.requested_at DESC");
    $stmt->execute([(int)$actor['id']]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'respond') {
    aec_method(['POST']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'student') aec_fail('Only the student can approve or reject a guardian request.', 403);
    aec_csrf_check();
    $id = aec_guardian_link_id();
    $input = aec_input();
    $decision = (string)($input['decision'] ?? '');
    if (!in_array($decision, ['accept','reject'], true)) aec_fail('Decision must be accept or reject.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT l.*, u.branch_id AS guardian_branch_id FROM guardian_student_links l JOIN users u ON u.id = l.guardian_user_id WHERE l.id = ? AND l.student_user_id = ? FOR UPDATE');
        $stmt->execute([$id, (int)$actor['id']]);
        $link = $stmt->fetch();
        if (!$link || $link['status'] !== 'pending') {
            $db->rollBack();
            aec_fail('Pending guardian request not found.', 404);
        }
        aec_guardian_same_branch(['branch_id' => $link['guardian_branch_id']], $actor);
        $status = $decision === 'accept' ? 'active' : 'rejected';
        $db->prepare('UPDATE guardian_student_links SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?')
            ->execute([$status, (int)$actor['id'], $id]);
        aec_guardian_audit($db, $actor, 'guardian_link.' . $status, $id, ['guardian_user_id' => (int)$link['guardian_user_id']]);
        aec_notify_user($db, (int)$link['guardian_user_id'], (int)$actor['id'], 'Guardian link request update', 'Your guardian link request was ' . $status . '.', $status === 'active' ? 'success' : 'warning', 'guardian_links', 'অভিভাবক সংযোগের আপডেট', 'আপনার অভিভাবক সংযোগের অনুরোধের অবস্থা: ' . $status . '।');
        $db->commit();
        aec_ok(['id' => $id, 'status' => $status], $status === 'active' ? 'Guardian link approved.' : 'Guardian link rejected.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

if ($action === 'revoke') {
    aec_method(['POST']);
    $actor = aec_current_user();
    if (!in_array($actor['role'], ['guardian','student'], true)) aec_fail('Only linked guardians or students can revoke a link.', 403);
    aec_csrf_check();
    $id = aec_guardian_link_id();
    $column = $actor['role'] === 'guardian' ? 'guardian_user_id' : 'student_user_id';
    $stmt = $db->prepare("UPDATE guardian_student_links SET status = 'revoked', reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ? AND {$column} = ? AND status IN ('pending','active')");
    $stmt->execute([(int)$actor['id'], $id, (int)$actor['id']]);
    if (!$stmt->rowCount()) aec_fail('Active or pending guardian link not found.', 404);
    aec_guardian_audit($db, $actor, 'guardian_link.revoked', $id);
    aec_ok(['id' => $id, 'status' => 'revoked'], 'Guardian link revoked. Access is removed immediately.');
}

if ($action === 'summary') {
    aec_method(['GET']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'guardian') aec_fail('Only guardian accounts can view student summaries.', 403);
    $studentId = filter_input(INPUT_GET, 'student_id', FILTER_VALIDATE_INT);
    if (!$studentId || $studentId < 1) aec_fail('A valid student id is required.', 422);
    $linkStmt = $db->prepare("SELECT 1 FROM guardian_student_links l JOIN users s ON s.id = l.student_user_id WHERE l.guardian_user_id = ? AND l.student_user_id = ? AND l.status = 'active' AND s.is_active = 1 LIMIT 1");
    $linkStmt->execute([(int)$actor['id'], $studentId]);
    if (!$linkStmt->fetchColumn()) aec_fail('Student is not linked to this guardian account.', 404);

    $profileStmt = $db->prepare("SELECT id, name, email, phone, branch_id FROM users WHERE id = ? AND role = 'student' AND is_active = 1 LIMIT 1");
    $profileStmt->execute([$studentId]);
    $profile = $profileStmt->fetch();
    if (!$profile) aec_fail('Student account is unavailable.', 404);
    aec_guardian_same_branch($actor, $profile);

    $coursesStmt = $db->prepare("SELECT ce.id, ce.course_id, c.title AS course_title, ce.status, ce.enrolled_at, ce.starts_at, ce.ends_at
        FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id
        WHERE ce.user_id = ? ORDER BY ce.enrolled_at DESC LIMIT 30");
    $coursesStmt->execute([$studentId]);
    $attendanceStmt = $db->prepare("SELECT ar.id, ar.attendance_date, ar.status, ar.remarks, c.title AS course_title
        FROM attendance_records ar JOIN courses c ON c.id = ar.course_id
        WHERE ar.user_id = ? ORDER BY ar.attendance_date DESC, ar.id DESC LIMIT 30");
    $attendanceStmt->execute([$studentId]);
    $examStmt = $db->prepare("SELECT ea.id, e.title AS exam_title, ea.score, ea.total_marks, ea.percentage, ea.passed, ea.submitted_at
        FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id
        WHERE ea.user_id = ? AND ea.status = 'submitted'
        ORDER BY ea.submitted_at DESC, ea.id DESC LIMIT 30");
    $examStmt->execute([$studentId]);
    $paymentStmt = $db->prepare("SELECT p.id, c.title AS course_title, p.amount, p.currency, p.payment_method, p.status, p.submitted_at, p.reviewed_at
        FROM course_payments p JOIN courses c ON c.id = p.course_id
        WHERE p.user_id = ? ORDER BY p.submitted_at DESC, p.id DESC LIMIT 30");
    $paymentStmt->execute([$studentId]);
    $certificateStmt = $db->prepare("SELECT certificate_number, course_title_snapshot, grade, status, issued_at
        FROM certificates WHERE student_user_id = ? ORDER BY issued_at DESC LIMIT 30");
    $certificateStmt->execute([$studentId]);

    aec_ok([
        'student' => $profile,
        'courses' => $coursesStmt->fetchAll(),
        'attendance' => $attendanceStmt->fetchAll(),
        'exams' => $examStmt->fetchAll(),
        'payments' => $paymentStmt->fetchAll(),
        'certificates' => $certificateStmt->fetchAll(),
    ]);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('guardians.manage');
    aec_assert_active_branch($db, $actor);
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = max(1, min(200, $limit ?: 100));
    $status = (string)($_GET['status'] ?? '');
    if ($status !== '' && !in_array($status, ['pending','active','rejected','revoked'], true)) aec_fail('Invalid link status.', 422);
    $where = [];
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $where[] = 'g.branch_id = ? AND s.branch_id = ?';
        $params[] = (int)$actor['branch_id'];
        $params[] = (int)$actor['branch_id'];
    }
    if ($status !== '') { $where[] = 'l.status = ?'; $params[] = $status; }
    $sql = "SELECT l.id, l.relationship, l.status, l.requested_at, l.reviewed_at,
        g.id AS guardian_user_id, g.name AS guardian_name, g.email AS guardian_email,
        s.id AS student_user_id, s.name AS student_name, s.email AS student_email,
        g.branch_id
        FROM guardian_student_links l
        JOIN users g ON g.id = l.guardian_user_id
        JOIN users s ON s.id = l.student_user_id" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY l.requested_at DESC LIMIT {$limit}";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

aec_fail('Unknown guardian action.', 404);
