<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'summary');

function aec_commission_money_cents(string $value): int {
    if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\\.[0-9]{1,2})?$/', $value)) return -1;
    [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '0');
    return ((int)$whole * 100) + (int)str_pad(substr($fraction, 0, 2), 2, '0');
}

function aec_commission_decimal(int $cents): string {
    return intdiv($cents, 100) . '.' . str_pad((string)($cents % 100), 2, '0', STR_PAD_LEFT);
}

function aec_commission_audit(PDO $db, array $actor, string $event, int $entityId, array $metadata = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'teacher_commission', $entityId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_commission_gross_cents(PDO $db, int $teacherId): int {
    $stmt = $db->prepare("SELECT COALESCE(SUM(ROUND((
          SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(r.refunded_amount, 0), 0)), 0)
          FROM course_payments p
          LEFT JOIN (
            SELECT payment_id, SUM(amount) AS refunded_amount
            FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id
          ) r ON r.payment_id = p.id
          WHERE p.course_id = a.course_id AND p.status IN ('verified','refunded')
            AND (a.branch_id IS NULL OR p.branch_id = a.branch_id)
        ) * 100 * a.commission_percentage / 100, 0)), 0)
        FROM teacher_course_assignments a
        JOIN courses c ON c.id = a.course_id
        WHERE a.teacher_user_id = ? AND a.is_active = 1 AND c.deleted_at IS NULL");
    $stmt->execute([$teacherId]);
    return max(0, (int)round((float)$stmt->fetchColumn()));
}

function aec_commission_payout_totals(PDO $db, int $teacherId): array {
    $stmt = $db->prepare("SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount ELSE 0 END), 0) AS reserved
      FROM teacher_payout_requests WHERE teacher_user_id = ?");
    $stmt->execute([$teacherId]);
    $row = $stmt->fetch() ?: ['paid' => 0, 'reserved' => 0];
    return ['paid' => (int)round((float)$row['paid'] * 100), 'reserved' => (int)round((float)$row['reserved'] * 100)];
}

function aec_commission_target_teacher(PDO $db, array $actor): int {
    if (in_array($actor['role'], ['teacher','assistant_teacher'], true)) return (int)$actor['id'];
    $target = filter_input(INPUT_GET, 'teacher_id', FILTER_VALIDATE_INT);
    if (!$target || $target < 1) aec_fail('A valid teacher_id is required.', 422);
    $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','assistant_teacher') AND is_active = 1 LIMIT 1");
    $stmt->execute([$target]);
    if (!$stmt->fetchColumn()) aec_fail('Teacher account not found.', 404);
    return (int)$target;
}

if ($action === 'summary') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $teacherId = null;
    if (in_array($actor['role'], ['teacher','assistant_teacher'], true)) {
        $teacherId = (int)$actor['id'];
    } else {
        $actor = aec_require_permission('teacher_commissions.manage');
        $target = filter_input(INPUT_GET, 'teacher_id', FILTER_VALIDATE_INT);
        if ($target && $target > 0) {
            $teacherStmt = $db->prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','assistant_teacher') AND is_active = 1 LIMIT 1");
            $teacherStmt->execute([$target]);
            if (!$teacherStmt->fetchColumn()) aec_fail('Teacher account not found.', 404);
            $teacherId = (int)$target;
        }
    }
    $where = ' WHERE a.is_active = 1 AND c.deleted_at IS NULL';
    $params = [];
    if ($teacherId !== null) { $where .= ' AND a.teacher_user_id = ?'; $params[] = $teacherId; }
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $where .= ' AND a.branch_id = ?'; $params[] = (int)$actor['branch_id'];
    }
    $stmt = $db->prepare("SELECT a.id, a.teacher_user_id, t.name AS teacher_name, c.id AS course_id, c.title AS course_title,
        a.commission_percentage,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status IN ('active','completed')
          AND (a.branch_id IS NULL OR ce.branch_id = a.branch_id)) AS total_enrolled_students,
        (SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(r.refunded_amount, 0), 0)), 0)
          FROM course_payments p
          LEFT JOIN (
            SELECT payment_id, SUM(amount) AS refunded_amount
            FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id
          ) r ON r.payment_id = p.id
          WHERE p.course_id = c.id AND p.status IN ('verified','refunded')
            AND (a.branch_id IS NULL OR p.branch_id = a.branch_id)) AS total_course_revenue,
        ROUND((SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(r.refunded_amount, 0), 0)), 0)
          FROM course_payments p
          LEFT JOIN (
            SELECT payment_id, SUM(amount) AS refunded_amount
            FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id
          ) r ON r.payment_id = p.id
          WHERE p.course_id = c.id AND p.status IN ('verified','refunded')
            AND (a.branch_id IS NULL OR p.branch_id = a.branch_id)) * a.commission_percentage / 100, 2) AS gross_commission
        FROM teacher_course_assignments a
        JOIN users t ON t.id = a.teacher_user_id
        JOIN courses c ON c.id = a.course_id
        {$where}
        ORDER BY t.name, c.title");
    $stmt->execute($params);
    $commissions = $stmt->fetchAll();

    if ($teacherId !== null) {
        $gross = aec_commission_gross_cents($db, $teacherId);
        $payouts = aec_commission_payout_totals($db, $teacherId);
    } else {
        $gross = 0;
        foreach ($commissions as $row) $gross += (int)round((float)$row['gross_commission'] * 100);
        $payoutQuery = "SELECT
          COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS paid,
          COALESCE(SUM(CASE WHEN p.status IN ('pending','approved') THEN p.amount ELSE 0 END), 0) AS reserved
          FROM teacher_payout_requests p";
        $payoutParams = [];
        if ($actor['role'] === 'branch_manager') { $payoutQuery .= ' WHERE p.branch_id = ?'; $payoutParams[] = (int)$actor['branch_id']; }
        $payoutStmt = $db->prepare($payoutQuery); $payoutStmt->execute($payoutParams);
        $payoutRow = $payoutStmt->fetch() ?: ['paid' => 0, 'reserved' => 0];
        $payouts = ['paid' => (int)round((float)$payoutRow['paid'] * 100), 'reserved' => (int)round((float)$payoutRow['reserved'] * 100)];
    }
    aec_ok([
        'commissions' => $commissions,
        'totals' => [
            'gross_commission' => aec_commission_decimal($gross),
            'paid_commission' => aec_commission_decimal($payouts['paid']),
            'reserved_payouts' => aec_commission_decimal($payouts['reserved']),
            'available_balance' => aec_commission_decimal(max(0, $gross - $payouts['paid'] - $payouts['reserved'])),
        ],
    ]);
}

if ($action === 'assignments') {
    aec_method(['GET']);
    $actor = aec_require_permission('teacher_commissions.manage');
    aec_assert_active_branch($db, $actor);
    $sql = "SELECT a.id, a.course_id, c.title AS course_title, a.teacher_user_id, u.name AS teacher_name,
        a.branch_id, a.commission_percentage, a.is_active, a.created_at
        FROM teacher_course_assignments a JOIN courses c ON c.id = a.course_id JOIN users u ON u.id = a.teacher_user_id";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' WHERE a.branch_id = ?'; $params[] = (int)$actor['branch_id'];
    }
    $sql .= ' ORDER BY c.title, u.name';
    $stmt = $db->prepare($sql); $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'assign') {
    aec_method(['POST']);
    $actor = aec_require_permission('teacher_commissions.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $teacherId = filter_var($input['teacher_user_id'] ?? null, FILTER_VALIDATE_INT);
    $rate = filter_var($input['commission_percentage'] ?? null, FILTER_VALIDATE_FLOAT);
    if (!$courseId || !$teacherId || $rate === false || $rate < 0 || $rate > 100) aec_fail('Course, teacher, and a commission rate from 0 to 100 are required.', 422);
    $db->beginTransaction();
    try {
        $courseStmt = $db->prepare('SELECT id, branch_id, deleted_at FROM courses WHERE id = ? FOR UPDATE');
        $courseStmt->execute([$courseId]); $course = $courseStmt->fetch();
        $teacherStmt = $db->prepare("SELECT id, branch_id, role, is_active FROM users WHERE id = ? FOR UPDATE");
        $teacherStmt->execute([$teacherId]); $teacher = $teacherStmt->fetch();
        if (!$course || $course['deleted_at'] !== null) aec_fail('Course not found.', 404);
        if (!$teacher || !(bool)$teacher['is_active'] || !in_array($teacher['role'], ['teacher','assistant_teacher'], true)) aec_fail('Active teacher account not found.', 404);
        if ($course['branch_id'] !== null && $teacher['branch_id'] !== null && (int)$course['branch_id'] !== (int)$teacher['branch_id']) aec_fail('Course and teacher must belong to the same branch.', 403);
        if ($actor['role'] === 'branch_manager' && (int)$course['branch_id'] !== (int)$actor['branch_id']) aec_fail('Course is outside your assigned branch.', 403);
        $branchId = $course['branch_id'] !== null ? (int)$course['branch_id'] : ($teacher['branch_id'] !== null ? (int)$teacher['branch_id'] : null);
        $rateStmt = $db->prepare('SELECT COALESCE(SUM(commission_percentage), 0) FROM teacher_course_assignments WHERE course_id = ? AND is_active = 1 AND teacher_user_id <> ?');
        $rateStmt->execute([$courseId, $teacherId]);
        if ((float)$rateStmt->fetchColumn() + (float)$rate > 100.0001) aec_fail('Combined teacher commission rates for a course cannot exceed 100%.', 422);
        $stmt = $db->prepare("INSERT INTO teacher_course_assignments (course_id, teacher_user_id, branch_id, commission_percentage, is_active, assigned_by)
            VALUES (?, ?, ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE branch_id = VALUES(branch_id), commission_percentage = VALUES(commission_percentage), is_active = 1, assigned_by = VALUES(assigned_by), updated_at = NOW()");
        $stmt->execute([$courseId, $teacherId, $branchId, number_format((float)$rate, 2, '.', ''), (int)$actor['id']]);
        $idStmt = $db->prepare('SELECT id FROM teacher_course_assignments WHERE course_id = ? AND teacher_user_id = ?');
        $idStmt->execute([$courseId, $teacherId]); $id = (int)$idStmt->fetchColumn();
        aec_commission_audit($db, $actor, 'teacher_commission.assigned', $id, ['course_id' => $courseId, 'teacher_user_id' => $teacherId, 'commission_percentage' => $rate]);
        $db->commit();
        aec_ok(['id' => $id], 'Teacher assigned to course.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

if ($action === 'unassign') {
    aec_method(['POST']);
    $actor = aec_require_permission('teacher_commissions.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid assignment id is required.', 422);
    $sql = 'UPDATE teacher_course_assignments SET is_active = 0, updated_at = NOW() WHERE id = ? AND is_active = 1';
    $params = [$id];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $stmt = $db->prepare($sql); $stmt->execute($params);
    if (!$stmt->rowCount()) aec_fail('Active assignment not found.', 404);
    aec_commission_audit($db, $actor, 'teacher_commission.unassigned', $id);
    aec_ok(['id' => $id], 'Teacher assignment disabled. Historical commission records remain.');
}

if ($action === 'payouts') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $where = ''; $params = [];
    if (in_array($actor['role'], ['teacher','assistant_teacher'], true)) {
        $where = ' WHERE p.teacher_user_id = ?'; $params[] = (int)$actor['id'];
    } else {
        $actor = aec_require_permission('teacher_commissions.manage');
        aec_assert_active_branch($db, $actor);
        if ($actor['role'] === 'branch_manager') {
            if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
            $where = ' WHERE p.branch_id = ?'; $params[] = (int)$actor['branch_id'];
        }
    }
    $stmt = $db->prepare("SELECT p.id, p.teacher_user_id, u.name AS teacher_name, p.amount, p.currency, p.payout_method,
        p.account_reference, p.bank_name, p.bank_branch, p.remarks, p.status, p.rejection_reason,
        p.external_transaction_reference, p.requested_at, p.reviewed_at, p.paid_at
        FROM teacher_payout_requests p JOIN users u ON u.id = p.teacher_user_id{$where}
        ORDER BY p.requested_at DESC LIMIT 200");
    $stmt->execute($params); aec_ok($stmt->fetchAll());
}

if ($action === 'request_payout') {
    aec_method(['POST']);
    $actor = aec_current_user();
    if (!in_array($actor['role'], ['teacher','assistant_teacher'], true)) aec_fail('Only teachers can request commission payouts.', 403);
    aec_csrf_check();
    $input = aec_input();
    $amountRaw = trim((string)($input['amount'] ?? ''));
    $amountCents = aec_commission_money_cents($amountRaw);
    $method = (string)($input['payout_method'] ?? '');
    $account = trim((string)($input['account_reference'] ?? ''));
    $bankName = trim((string)($input['bank_name'] ?? ''));
    $bankBranch = trim((string)($input['bank_branch'] ?? ''));
    $remarks = trim((string)($input['remarks'] ?? ''));
    if ($amountCents <= 0) aec_fail('Enter a positive payout amount with up to two decimal places.', 422);
    if (!in_array($method, ['bKash','Nagad','Bank Transfer'], true)) aec_fail('Unsupported payout method.', 422);
    if ($account === '' || mb_strlen($account) > 190) aec_fail('A valid payout account reference is required.', 422);
    if ($method === 'Bank Transfer' && ($bankName === '' || mb_strlen($bankName) > 160 || mb_strlen($bankBranch) > 160)) aec_fail('Bank name and branch are required for bank transfers.', 422);
    if (mb_strlen($remarks) > 500) aec_fail('Remarks are too long.', 422);
    $db->beginTransaction();
    try {
        $lock = $db->prepare('SELECT id, branch_id FROM users WHERE id = ? AND is_active = 1 FOR UPDATE');
        $lock->execute([(int)$actor['id']]); $teacher = $lock->fetch();
        if (!$teacher) aec_fail('Teacher account is unavailable.', 404);
        $gross = aec_commission_gross_cents($db, (int)$actor['id']);
        $totals = aec_commission_payout_totals($db, (int)$actor['id']);
        $available = max(0, $gross - $totals['paid'] - $totals['reserved']);
        if ($amountCents > $available) aec_fail('Payout amount exceeds your available commission balance.', 422, ['available_balance' => aec_commission_decimal($available)]);
        $stmt = $db->prepare("INSERT INTO teacher_payout_requests (teacher_user_id, branch_id, amount, payout_method, account_reference, bank_name, bank_branch, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([(int)$actor['id'], $teacher['branch_id'] === null ? null : (int)$teacher['branch_id'], aec_commission_decimal($amountCents), $method, $account, $bankName ?: null, $bankBranch ?: null, $remarks ?: null]);
        $id = (int)$db->lastInsertId();
        aec_commission_audit($db, $actor, 'teacher_payout.requested', $id, ['amount' => aec_commission_decimal($amountCents), 'method' => $method]);
        $db->commit();
        aec_ok(['id' => $id, 'status' => 'pending', 'available_balance' => aec_commission_decimal($available - $amountCents)], 'Payout request submitted.', 201);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

if ($action === 'review_payout') {
    aec_method(['POST']);
    $actor = aec_require_permission('teacher_commissions.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid payout request id is required.', 422);
    $input = aec_input();
    $decision = (string)($input['decision'] ?? '');
    $reason = trim((string)($input['reason'] ?? ''));
    if (!in_array($decision, ['approve','reject'], true)) aec_fail('Decision must be approve or reject.', 422);
    if ($decision === 'reject' && ($reason === '' || mb_strlen($reason) > 500)) aec_fail('A rejection reason is required.', 422);
    $db->beginTransaction();
    try {
        $sql = 'SELECT * FROM teacher_payout_requests WHERE id = ? FOR UPDATE';
        $stmt = $db->prepare($sql); $stmt->execute([$id]); $payout = $stmt->fetch();
        if (!$payout || ($actor['role'] === 'branch_manager' && (int)$payout['branch_id'] !== (int)$actor['branch_id'])) aec_fail('Payout request not found.', 404);
        if ($payout['status'] !== 'pending') aec_fail('Only pending payout requests can be reviewed.', 409);
        $status = $decision === 'approve' ? 'approved' : 'rejected';
        $db->prepare('UPDATE teacher_payout_requests SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?')
            ->execute([$status, $decision === 'reject' ? $reason : null, (int)$actor['id'], $id]);
        aec_commission_audit($db, $actor, 'teacher_payout.' . $status, $id, ['teacher_user_id' => (int)$payout['teacher_user_id']]);
        aec_notify_user($db, (int)$payout['teacher_user_id'], (int)$actor['id'], 'Teacher payout update', 'Your payout request has been ' . $status . '.', $status === 'approved' ? 'success' : 'warning', 'teacher_commissions');
        $db->commit();
        aec_ok(['id' => $id, 'status' => $status], 'Payout request ' . $status . '.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

if ($action === 'mark_paid') {
    aec_method(['POST']);
    $actor = aec_require_permission('teacher_commissions.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid payout request id is required.', 422);
    $input = aec_input();
    $reference = trim((string)($input['external_transaction_reference'] ?? ''));
    if ($reference === '' || mb_strlen($reference) > 120) aec_fail('A valid external transaction reference is required.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT * FROM teacher_payout_requests WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]); $payout = $stmt->fetch();
        if (!$payout || ($actor['role'] === 'branch_manager' && (int)$payout['branch_id'] !== (int)$actor['branch_id'])) aec_fail('Payout request not found.', 404);
        if ($payout['status'] !== 'approved') aec_fail('Only approved payouts can be marked paid.', 409);
        $db->prepare("UPDATE teacher_payout_requests SET status = 'paid', external_transaction_reference = ?, paid_by = ?, paid_at = NOW(), updated_at = NOW() WHERE id = ?")
            ->execute([$reference, (int)$actor['id'], $id]);
        aec_commission_audit($db, $actor, 'teacher_payout.paid', $id, ['teacher_user_id' => (int)$payout['teacher_user_id'], 'external_transaction_reference' => $reference]);
        aec_notify_user($db, (int)$payout['teacher_user_id'], (int)$actor['id'], 'Teacher payout sent', 'Your approved commission payout has been marked as paid.', 'success', 'teacher_commissions');
        $db->commit();
        aec_ok(['id' => $id, 'status' => 'paid'], 'Payout marked as paid. Record the actual provider/bank reference only after the transfer is confirmed.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($e instanceof PDOException && $e->getCode() === '23000') aec_fail('This external transaction reference is already recorded.', 409);
        throw $e;
    }
}

aec_fail('Unknown teacher commission action.', 404);
