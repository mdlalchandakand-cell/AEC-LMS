<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_marksheet_grade(float $percentage): string
{
    if ($percentage >= 80) return 'A+';
    if ($percentage >= 70) return 'A';
    if ($percentage >= 60) return 'A-';
    if ($percentage >= 50) return 'B';
    if ($percentage >= 40) return 'C';
    return 'F';
}

function aec_marksheet_can_manage(PDO $db, array $user): bool
{
    if (in_array(($user['role'] ?? ''), ['admin', 'super_admin'], true)) return true;
    $stmt = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'marksheets.manage' LIMIT 1");
    $stmt->execute([$user['role']]);
    return (bool)$stmt->fetchColumn();
}

if ($action === 'list') {
    aec_method(['GET']);
    $viewer = aec_current_user();
    $canManage = aec_marksheet_can_manage($db, $viewer);
    $sql = 'SELECT m.id, m.marksheet_number, m.exam_attempt_id, m.exam_id, m.student_user_id,
                   m.student_name_snapshot AS student_name, m.student_email_snapshot AS student_email,
                   m.exam_title_snapshot AS exam_title, m.course_title_snapshot AS course_title,
                   m.score, m.total_marks, m.percentage, m.passed, m.grade, m.issued_at,
                   issuer.name AS issued_by
            FROM marksheets m INNER JOIN users issuer ON issuer.id = m.issued_by';
    $params = [];
    if (!$canManage) {
        $sql .= ' WHERE m.student_user_id = ?';
        $params[] = (int)$viewer['id'];
    }
    $sql .= ' ORDER BY m.issued_at DESC, m.id DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'eligible_attempts') {
    aec_method(['GET']);
    $manager = aec_require_permission('marksheets.manage');
    if (!in_array(($manager['role'] ?? ''), ['admin', 'super_admin'], true)) aec_fail('Only global administrators can issue marksheets until branch-scoped marksheet access is implemented.', 403);
    $stmt = $db->query(
        "SELECT a.id AS attempt_id, a.exam_id, a.user_id AS student_user_id,
                u.name AS student_name, u.email AS student_email,
                e.title AS exam_title, e.course_id, c.title AS course_title,
                a.score, a.total_marks, a.percentage, a.passed, a.submitted_at
         FROM exam_attempts a
         INNER JOIN exams e ON e.id = a.exam_id
         INNER JOIN users u ON u.id = a.user_id
         LEFT JOIN courses c ON c.id = e.course_id
         LEFT JOIN marksheets m ON m.exam_attempt_id = a.id
         WHERE a.status = 'submitted' AND a.submitted_at IS NOT NULL
           AND a.score IS NOT NULL AND a.total_marks > 0 AND a.percentage IS NOT NULL
           AND m.id IS NULL
         ORDER BY a.submitted_at DESC, a.id DESC LIMIT 200"
    );
    aec_ok($stmt->fetchAll());
}

if ($action === 'issue') {
    aec_method(['POST']);
    $actor = aec_require_permission('marksheets.manage');
    if (!in_array(($actor['role'] ?? ''), ['admin', 'super_admin'], true)) aec_fail('Only global administrators can issue marksheets until branch-scoped marksheet access is implemented.', 403);
    aec_csrf_check();
    $input = aec_input();
    $attemptId = filter_var($input['attempt_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$attemptId || $attemptId < 1) aec_fail('A valid submitted exam attempt is required.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            "SELECT a.id, a.exam_id, a.user_id, a.score, a.total_marks, a.percentage, a.passed,
                    a.status, a.submitted_at, e.title AS exam_title, e.course_id,
                    u.name AS student_name, u.email AS student_email, c.title AS course_title
             FROM exam_attempts a
             INNER JOIN exams e ON e.id = a.exam_id
             INNER JOIN users u ON u.id = a.user_id
             LEFT JOIN courses c ON c.id = e.course_id
             WHERE a.id = ? LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([(int)$attemptId]);
        $attempt = $stmt->fetch();
        if (!$attempt || $attempt['status'] !== 'submitted' || $attempt['submitted_at'] === null
            || $attempt['score'] === null || $attempt['total_marks'] === null
            || (float)$attempt['total_marks'] <= 0 || $attempt['percentage'] === null) {
            aec_fail('Only a fully submitted and scored exam attempt can receive a marksheet.', 409);
        }
        $existing = $db->prepare('SELECT id FROM marksheets WHERE exam_attempt_id = ? LIMIT 1');
        $existing->execute([(int)$attemptId]);
        if ($existing->fetchColumn()) aec_fail('A marksheet has already been issued for this exam attempt.', 409);

        $score = round((float)$attempt['score'], 2);
        $total = round((float)$attempt['total_marks'], 2);
        $percentage = round(max(0, min(100, (float)$attempt['percentage'])), 2);
        $grade = aec_marksheet_grade($percentage);
        $number = 'AEC-MS-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(8)));
        $insert = $db->prepare(
            'INSERT INTO marksheets
             (marksheet_number, exam_attempt_id, exam_id, student_user_id, course_id,
              student_name_snapshot, student_email_snapshot, exam_title_snapshot, course_title_snapshot,
              score, total_marks, percentage, passed, grade, issued_by, issued_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $insert->execute([
            $number, (int)$attempt['id'], (int)$attempt['exam_id'], (int)$attempt['user_id'],
            $attempt['course_id'] !== null ? (int)$attempt['course_id'] : null,
            (string)$attempt['student_name'], (string)$attempt['student_email'], (string)$attempt['exam_title'],
            $attempt['course_title'] !== null ? (string)$attempt['course_title'] : null,
            $score, $total, $percentage, (int)$attempt['passed'], $grade, (int)$actor['id'],
        ]);
        $id = (int)$db->lastInsertId();
        $audit = $db->prepare(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $audit->execute([
            (int)$actor['id'],
            'marksheet.issued',
            'marksheet',
            $id,
            $_SERVER['REMOTE_ADDR'] ?? null,
            json_encode([
                'marksheet_number' => $number,
                'exam_attempt_id' => (int)$attempt['id'],
                'student_user_id' => (int)$attempt['user_id'],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        $db->commit();
        aec_ok(['id' => $id, 'marksheet_number' => $number, 'grade' => $grade], 'Official marksheet issued from submitted exam result.', 201);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

aec_fail('Unknown marksheet action.', 404);
