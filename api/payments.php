<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'my';

function aec_payment_audit(PDO $db, array $actor, string $event, int $paymentId, array $meta = []): void {
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$actor['id'], $event, 'course_payment', $paymentId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function aec_money_cents(string $value): int {
    $parts = explode('.', $value, 2);
    $whole = (int)$parts[0];
    $fraction = isset($parts[1]) ? (int)str_pad(substr($parts[1], 0, 2), 2, '0') : 0;
    return ($whole * 100) + $fraction;
}

function aec_cents_decimal(int $cents): string {
    return intdiv($cents, 100) . '.' . str_pad((string)($cents % 100), 2, '0', STR_PAD_LEFT);
}

function aec_payment_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid payment id is required.', 422);
    return (int)$id;
}

if ($action === 'my') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $stmt = $db->prepare("SELECT p.id, p.course_id, c.title AS course_title, p.amount, p.currency, p.payment_method,
        p.trx_id, p.status, p.submitted_at, p.reviewed_at, p.rejection_reason,
        COALESCE(refunds.refunded_amount, 0) AS refunded_amount
        FROM course_payments p JOIN courses c ON c.id = p.course_id
        LEFT JOIN (SELECT payment_id, SUM(amount) AS refunded_amount FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id) refunds ON refunds.payment_id = p.id
        WHERE p.user_id = ? ORDER BY p.submitted_at DESC");
    $stmt->execute([(int)$actor['id']]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'submit') {
    aec_method(['POST']);
    $actor = aec_current_user();
    if ($actor['role'] !== 'student') aec_fail('Only students can submit their own course payments.', 403);
    aec_csrf_check();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $amountRaw = (string)($input['amount'] ?? '');
    $method = (string)($input['method'] ?? '');
    $trxId = trim((string)($input['trx_id'] ?? ''));
    $senderPhone = trim((string)($input['sender_phone'] ?? ''));
    if (!$courseId || $courseId < 1) aec_fail('A valid course_id is required.', 422);
    if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/', $amountRaw)) aec_fail('Amount must be a valid positive BDT amount with up to two decimal places.', 422);
    $amount = (float)$amountRaw;
    if ($amount <= 0) aec_fail('Payment amount must be greater than zero.', 422);
    if (!in_array($method, ['bKash', 'Nagad', 'Bank Transfer'], true)) aec_fail('Unsupported payment method.', 422);
    if ($trxId === '' || strlen($trxId) > 120) aec_fail('A valid transaction reference is required.', 422);
    if ($senderPhone !== '' && strlen($senderPhone) > 32) aec_fail('Sender phone number is too long.', 422);

    $db->beginTransaction();
    try {
        $courseStmt = $db->prepare("SELECT id, title, price, branch_id FROM courses WHERE id = ? AND status = 'published' AND deleted_at IS NULL LIMIT 1 FOR UPDATE");
        $courseStmt->execute([$courseId]);
        $course = $courseStmt->fetch();
        if (!$course) {
            $db->rollBack();
            aec_fail('Published course not found.', 404);
        }
        if ($course['branch_id'] !== null && (int)$course['branch_id'] !== (int)($actor['branch_id'] ?? 0)) {
            $db->rollBack();
            aec_fail('This course is not available to your assigned branch.', 403);
        }
        $paymentBranchId = $actor['branch_id'] !== null ? (int)$actor['branch_id'] : ($course['branch_id'] !== null ? (int)$course['branch_id'] : null);
        if ($paymentBranchId !== null) {
            $activeBranch = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
            $activeBranch->execute([$paymentBranchId]);
            if (!$activeBranch->fetchColumn()) {
                $db->rollBack();
                aec_fail('Payments are closed for this inactive branch.', 409);
            }
        }
        $sumStmt = $db->prepare("SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(refunds.refunded_amount, 0), 0)), 0)
            FROM course_payments p
            LEFT JOIN (SELECT payment_id, SUM(amount) AS refunded_amount FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id) refunds ON refunds.payment_id = p.id
            WHERE p.user_id = ? AND p.course_id = ? AND p.status IN ('pending','verified','refunded')");
        $sumStmt->execute([(int)$actor['id'], (int)$courseId]);
        $committedCents = aec_money_cents((string)$sumStmt->fetchColumn());
        $remainingCents = max(0, aec_money_cents((string)$course['price']) - $committedCents);
        $amountCents = aec_money_cents($amountRaw);
        if ($amountCents > $remainingCents) {
            $db->rollBack();
            aec_fail('Payment exceeds the remaining course fee.', 422, ['remaining_amount' => aec_cents_decimal($remainingCents)]);
        }
        $stmt = $db->prepare('INSERT INTO course_payments (user_id, course_id, branch_id, amount, payment_method, trx_id, sender_phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([(int)$actor['id'], (int)$courseId, $paymentBranchId, aec_cents_decimal($amountCents), $method, $trxId, $senderPhone ?: null]);
        $paymentId = (int)$db->lastInsertId();
        $remainingAfter = max(0, $remainingCents - $amountCents);
        $db->commit();
    } catch (PDOException $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($e->getCode() === '23000') aec_fail('This transaction reference has already been submitted.', 409);
        throw $e;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    aec_ok(['id' => $paymentId, 'remaining_amount' => aec_cents_decimal($remainingAfter)], 'Payment submitted for manual verification.', 201);
}

if ($action === 'list') {
    aec_method(['GET']);
    $actor = aec_require_permission('payments.manage');
    aec_assert_active_branch($db, $actor);
    $limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
    $limit = max(1, min(200, $limit ?: 100));
    $status = (string)($_GET['status'] ?? '');
    $whereParts = [];
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $whereParts[] = 'p.branch_id = ?';
        $params[] = (int)$actor['branch_id'];
    }
    if ($status !== '') {
        if (!in_array($status, ['pending', 'verified', 'rejected', 'refunded'], true)) aec_fail('Invalid payment status.', 422);
        $whereParts[] = 'p.status = ?';
        $params[] = $status;
    }
    $where = $whereParts ? ' WHERE ' . implode(' AND ', $whereParts) : '';
    $stmt = $db->prepare("SELECT p.id, p.user_id, u.name AS student_name, u.email AS student_email,
        p.course_id, c.title AS course_title, p.amount, p.currency, p.payment_method, p.trx_id,
        p.sender_phone, p.status, p.submitted_at, p.reviewed_at, p.rejection_reason, reviewer.name AS reviewed_by_name,
        COALESCE(refunds.refunded_amount, 0) AS refunded_amount
        FROM course_payments p JOIN users u ON u.id = p.user_id JOIN courses c ON c.id = p.course_id
        LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
        LEFT JOIN (SELECT payment_id, SUM(amount) AS refunded_amount FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id) refunds ON refunds.payment_id = p.id
        $where ORDER BY p.submitted_at DESC LIMIT $limit");
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'verify' || $action === 'reject') {
    aec_method(['POST']);
    $actor = aec_require_permission('payments.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_payment_id();
    $input = aec_input();
    $reason = trim((string)($input['reason'] ?? ''));
    if ($action === 'reject' && ($reason === '' || mb_strlen($reason) > 500)) aec_fail('A rejection reason (maximum 500 characters) is required.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT p.*, c.price AS course_price, c.title AS course_title, u.branch_id AS student_branch_id FROM course_payments p JOIN courses c ON c.id = p.course_id JOIN users u ON u.id = p.user_id WHERE p.id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $payment = $stmt->fetch();
        if (!$payment) {
            $db->rollBack();
            aec_fail('Payment not found.', 404);
        }
        if ($actor['role'] === 'branch_manager' && (int)$payment['branch_id'] !== (int)$actor['branch_id']) {
            $db->rollBack();
            aec_fail('Payment not found.', 404);
        }
        if ($payment['status'] !== 'pending') {
            $db->rollBack();
            aec_fail('Only pending payments can be reviewed.', 409);
        }

        if ($action === 'reject') {
            $db->prepare("UPDATE course_payments SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?, rejection_reason = ? WHERE id = ?")
                ->execute([(int)$actor['id'], $reason, $id]);
            aec_payment_audit($db, $actor, 'payment.rejected', $id, ['reason' => $reason]);
            aec_notify_user($db, (int)$payment['user_id'], (int)$actor['id'], 'Payment rejected', 'Your payment for ' . $payment['course_title'] . ' was rejected. Reason: ' . $reason, 'warning', 'payments', 'পেমেন্ট প্রত্যাখ্যান করা হয়েছে', 'আপনার ' . $payment['course_title'] . ' কোর্সের পেমেন্ট প্রত্যাখ্যান করা হয়েছে। কারণ: ' . $reason);
            $db->commit();
            aec_ok(['id' => $id], 'Payment rejected.');
        }

        $db->prepare("UPDATE course_payments SET status = 'verified', reviewed_at = NOW(6), reviewed_by = ? WHERE id = ?")
            ->execute([(int)$actor['id'], $id]);

        $accountCode = $payment['payment_method'] === 'Bank Transfer'
            ? 'ASSET_BANK_CLEARING'
            : 'ASSET_BKASH_NAGAD_CLEARING';
        $accountStmt = $db->prepare('SELECT id FROM accounting_accounts WHERE account_code = ? AND is_active = 1');
        $accountStmt->execute([$accountCode]);
        $debitAccount = $accountStmt->fetchColumn();
        $accountStmt->execute(['INCOME_TUITION']);
        $creditAccount = $accountStmt->fetchColumn();
        if (!$debitAccount || !$creditAccount) throw new RuntimeException('Required accounting accounts are missing.');

        $reference = 'PAY-' . str_pad((string)$id, 10, '0', STR_PAD_LEFT);
        $db->prepare('INSERT INTO ledger_transactions (payment_id, reference, description, created_by) VALUES (?, ?, ?, ?)')
            ->execute([$id, $reference, 'Verified course fee: ' . $payment['course_id'], (int)$actor['id']]);
        $ledgerId = (int)$db->lastInsertId();
        $entry = $db->prepare('INSERT INTO ledger_entries (transaction_id, account_id, debit, credit, currency) VALUES (?, ?, ?, ?, ?)');
        $entry->execute([$ledgerId, (int)$debitAccount, $payment['amount'], '0.00', 'BDT']);
        $entry->execute([$ledgerId, (int)$creditAccount, '0.00', $payment['amount'], 'BDT']);

        $paidStmt = $db->prepare("SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(refunds.refunded_amount, 0), 0)), 0)
            FROM course_payments p
            LEFT JOIN (SELECT payment_id, SUM(amount) AS refunded_amount FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id) refunds ON refunds.payment_id = p.id
            WHERE p.user_id = ? AND p.course_id = ? AND p.status IN ('verified','refunded')");
        $paidStmt->execute([(int)$payment['user_id'], (int)$payment['course_id']]);
        $paidCents = aec_money_cents((string)$paidStmt->fetchColumn());
        $coursePriceCents = aec_money_cents((string)$payment['course_price']);
        if ($coursePriceCents > 0 && $paidCents >= $coursePriceCents) {
            $existing = $db->prepare('SELECT id, status FROM course_enrollments WHERE user_id = ? AND course_id = ? LIMIT 1 FOR UPDATE');
            $existing->execute([(int)$payment['user_id'], (int)$payment['course_id']]);
            $enrollment = $existing->fetch();
            if (!$enrollment) {
                $db->prepare("INSERT INTO course_enrollments (user_id, course_id, branch_id, status, enrolled_by) VALUES (?, ?, ?, 'active', ?)")
                    ->execute([(int)$payment['user_id'], (int)$payment['course_id'], $payment['student_branch_id'] ?? null, (int)$actor['id']]);
            } elseif ($enrollment['status'] === 'pending') {
                $db->prepare("UPDATE course_enrollments SET status = 'active', updated_at = NOW() WHERE id = ?")
                    ->execute([(int)$enrollment['id']]);
            }
        }
        aec_payment_audit($db, $actor, 'payment.verified', $id, ['ledger_reference' => $reference, 'paid_total' => aec_cents_decimal($paidCents)]);
        aec_notify_user($db, (int)$payment['user_id'], (int)$actor['id'], 'Payment verified', 'Your payment for ' . $payment['course_title'] . ' has been verified. Your paid total is BDT ' . aec_cents_decimal($paidCents) . '.', 'success', 'payments', 'পেমেন্ট যাচাই সম্পন্ন', 'আপনার ' . $payment['course_title'] . ' কোর্সের পেমেন্ট যাচাই সম্পন্ন হয়েছে।');
        $db->commit();
        aec_ok(['id' => $id, 'ledger_reference' => $reference, 'verified_total' => aec_cents_decimal($paidCents), 'course_fee' => aec_cents_decimal($coursePriceCents), 'course_access_activated' => $coursePriceCents > 0 && $paidCents >= $coursePriceCents], 'Payment verified and ledger posted.');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log('AEC payment review failed: ' . $e->getMessage());
        aec_fail('Payment review could not be completed.', 500);
    }
}

if ($action === 'refund') {
    aec_method(['POST']);
    $actor = aec_require_permission('payments.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = aec_payment_id();
    $input = aec_input();
    $amountRaw = trim((string)($input['amount'] ?? ''));
    $refundReference = trim((string)($input['refund_reference'] ?? ''));
    $reason = trim((string)($input['reason'] ?? ''));
    if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\\.[0-9]{1,2})?$/', $amountRaw) || aec_money_cents($amountRaw) <= 0) {
        aec_fail('Refund amount must be a positive BDT amount with up to two decimal places.', 422);
    }
    if ($refundReference === '' || strlen($refundReference) > 120) aec_fail('A valid external provider refund reference is required.', 422);
    if ($reason === '' || mb_strlen($reason) > 500) aec_fail('A refund reason (maximum 500 characters) is required.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT p.*, c.price AS course_price, c.title AS course_title, u.branch_id AS student_branch_id
            FROM course_payments p
            JOIN courses c ON c.id = p.course_id
            JOIN users u ON u.id = p.user_id
            WHERE p.id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $payment = $stmt->fetch();
        if (!$payment) {
            $db->rollBack();
            aec_fail('Payment not found.', 404);
        }
        if ($actor['role'] === 'branch_manager' && (int)$payment['branch_id'] !== (int)$actor['branch_id']) {
            $db->rollBack();
            aec_fail('Payment not found.', 404);
        }
        if (!in_array($payment['status'], ['verified','refunded'], true)) {
            $db->rollBack();
            aec_fail('Only verified payments can be refunded.', 409);
        }

        $refundSum = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM payment_refunds WHERE payment_id = ? AND status = 'completed'");
        $refundSum->execute([$id]);
        $alreadyRefunded = aec_money_cents((string)$refundSum->fetchColumn());
        $paymentCents = aec_money_cents((string)$payment['amount']);
        $refundCents = aec_money_cents($amountRaw);
        $remainingRefundable = max(0, $paymentCents - $alreadyRefunded);
        if ($refundCents > $remainingRefundable) {
            $db->rollBack();
            aec_fail('Refund exceeds the remaining refundable amount.', 422, ['remaining_refundable' => aec_cents_decimal($remainingRefundable)]);
        }

        $refundInsert = $db->prepare("INSERT INTO payment_refunds (payment_id, amount, currency, refund_reference, reason, processed_by)
            VALUES (?, ?, ?, ?, ?, ?)");
        $refundInsert->execute([$id, aec_cents_decimal($refundCents), $payment['currency'], $refundReference, $reason, (int)$actor['id']]);
        $refundId = (int)$db->lastInsertId();

        $accountCode = $payment['payment_method'] === 'Bank Transfer' ? 'ASSET_BANK_CLEARING' : 'ASSET_BKASH_NAGAD_CLEARING';
        $accountStmt = $db->prepare('SELECT id FROM accounting_accounts WHERE account_code = ? AND is_active = 1');
        $accountStmt->execute(['INCOME_TUITION']);
        $debitAccount = $accountStmt->fetchColumn();
        $accountStmt->execute([$accountCode]);
        $creditAccount = $accountStmt->fetchColumn();
        if (!$debitAccount || !$creditAccount) throw new RuntimeException('Required refund accounting accounts are missing.');

        $ledgerReference = 'REF-' . str_pad((string)$refundId, 10, '0', STR_PAD_LEFT);
        $db->prepare('INSERT INTO ledger_transactions (payment_id, refund_id, reference, description, created_by) VALUES (NULL, ?, ?, ?, ?)')
            ->execute([$refundId, $ledgerReference, 'Refund for course payment ' . $id, (int)$actor['id']]);
        $ledgerId = (int)$db->lastInsertId();
        $entry = $db->prepare('INSERT INTO ledger_entries (transaction_id, account_id, debit, credit, currency) VALUES (?, ?, ?, ?, ?)');
        $entry->execute([$ledgerId, (int)$debitAccount, aec_cents_decimal($refundCents), '0.00', $payment['currency']]);
        $entry->execute([$ledgerId, (int)$creditAccount, '0.00', aec_cents_decimal($refundCents), $payment['currency']]);

        $refundedTotal = $alreadyRefunded + $refundCents;
        $paymentStatus = $refundedTotal >= $paymentCents ? 'refunded' : 'verified';
        $db->prepare('UPDATE course_payments SET status = ? WHERE id = ?')->execute([$paymentStatus, $id]);

        $netPaidStmt = $db->prepare("SELECT COALESCE(SUM(GREATEST(p.amount - COALESCE(refunds.refunded_amount, 0), 0)), 0)
            FROM course_payments p
            LEFT JOIN (SELECT payment_id, SUM(amount) AS refunded_amount FROM payment_refunds WHERE status = 'completed' GROUP BY payment_id) refunds ON refunds.payment_id = p.id
            WHERE p.user_id = ? AND p.course_id = ? AND p.status IN ('verified','refunded')");
        $netPaidStmt->execute([(int)$payment['user_id'], (int)$payment['course_id']]);
        $netPaidCents = aec_money_cents((string)$netPaidStmt->fetchColumn());
        $coursePriceCents = aec_money_cents((string)$payment['course_price']);
        $accessCancelled = false;
        if ($coursePriceCents > 0 && $netPaidCents < $coursePriceCents) {
            $cancel = $db->prepare("UPDATE course_enrollments SET status = 'cancelled', updated_at = NOW()
                WHERE user_id = ? AND course_id = ? AND status = 'active'");
            $cancel->execute([(int)$payment['user_id'], (int)$payment['course_id']]);
            $accessCancelled = $cancel->rowCount() > 0;
        }

        aec_notify_user($db, (int)$payment['user_id'], (int)$actor['id'], 'Payment refund recorded', 'A refund of BDT ' . aec_cents_decimal($refundCents) . ' was recorded for ' . $payment['course_title'] . '. Provider reference: ' . $refundReference . '.', 'warning', 'payments', 'পেমেন্ট রিফান্ড রেকর্ড করা হয়েছে', $payment['course_title'] . ' কোর্সের BDT ' . aec_cents_decimal($refundCents) . ' রিফান্ড রেকর্ড করা হয়েছে।');
        aec_payment_audit($db, $actor, 'payment.refunded', $id, [
            'refund_id' => $refundId,
            'refund_reference' => $refundReference,
            'refund_amount' => aec_cents_decimal($refundCents),
            'refunded_total' => aec_cents_decimal($refundedTotal),
            'net_course_paid' => aec_cents_decimal($netPaidCents),
            'ledger_reference' => $ledgerReference,
        ]);
        $db->commit();
        aec_ok([
            'id' => $id,
            'refund_id' => $refundId,
            'ledger_reference' => $ledgerReference,
            'payment_status' => $paymentStatus,
            'refunded_total' => aec_cents_decimal($refundedTotal),
            'remaining_refundable' => aec_cents_decimal(max(0, $paymentCents - $refundedTotal)),
            'net_course_paid' => aec_cents_decimal($netPaidCents),
            'course_access_cancelled' => $accessCancelled,
        ], 'Provider-confirmed refund recorded and reversal journal posted.');
    } catch (PDOException $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($e->getCode() === '23000') aec_fail('Refund reference already exists or the refund conflicts with an existing record.', 409);
        error_log('AEC payment refund failed: ' . $e->getMessage());
        aec_fail('Refund could not be recorded.', 500);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log('AEC payment refund failed: ' . $e->getMessage());
        aec_fail('Refund could not be recorded.', 500);
    }
}

if ($action === 'ledger') {
    aec_method(['GET']);
    $actor = aec_require_permission('payments.manage');
    aec_assert_active_branch($db, $actor);
    $sql = "SELECT t.id AS ledger_id, t.reference, t.description, t.created_at,
        COALESCE(p.id, refund_payment.id) AS payment_id,
        COALESCE(p.user_id, refund_payment.user_id) AS user_id,
        u.name AS student_name,
        COALESCE(p.course_id, refund_payment.course_id) AS course_id,
        c.title AS course_title,
        CASE WHEN r.id IS NOT NULL THEN r.amount ELSE p.amount END AS amount,
        COALESCE(p.currency, r.currency) AS currency,
        COALESCE(p.payment_method, refund_payment.payment_method) AS payment_method,
        COALESCE(p.trx_id, r.refund_reference) AS trx_id,
        r.refund_reference, r.reason AS refund_reason,
        CASE WHEN r.id IS NOT NULL THEN 'refund' ELSE 'payment' END AS transaction_type,
        a.account_code, a.account_name, e.debit, e.credit
        FROM ledger_transactions t
        LEFT JOIN course_payments p ON p.id = t.payment_id
        LEFT JOIN payment_refunds r ON r.id = t.refund_id
        LEFT JOIN course_payments refund_payment ON refund_payment.id = r.payment_id
        JOIN users u ON u.id = COALESCE(p.user_id, refund_payment.user_id)
        JOIN courses c ON c.id = COALESCE(p.course_id, refund_payment.course_id)
        JOIN ledger_entries e ON e.transaction_id = t.id
        JOIN accounting_accounts a ON a.id = e.account_id";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' WHERE COALESCE(p.branch_id, refund_payment.branch_id) = ?';
        $params[] = (int)$actor['branch_id'];
    }
    $sql .= ' ORDER BY t.created_at DESC, e.id ASC LIMIT 1000';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'reconcile') {
    aec_method(['GET']);
    $actor = aec_require_permission('payments.manage');
    aec_assert_active_branch($db, $actor);
    $sql = "SELECT t.id AS ledger_id, t.reference, t.created_at,
        CASE WHEN r.id IS NOT NULL THEN 'refund' ELSE 'payment' END AS transaction_type,
        COALESCE(p.id, refund_payment.id) AS payment_id,
        u.name AS student_name,
        COALESCE(p.branch_id, refund_payment.branch_id) AS branch_id,
        COALESCE(SUM(e.debit), 0) AS debit_total,
        COALESCE(SUM(e.credit), 0) AS credit_total,
        COUNT(e.id) AS entry_count
        FROM ledger_transactions t
        LEFT JOIN course_payments p ON p.id = t.payment_id
        LEFT JOIN payment_refunds r ON r.id = t.refund_id
        LEFT JOIN course_payments refund_payment ON refund_payment.id = r.payment_id
        JOIN users u ON u.id = COALESCE(p.user_id, refund_payment.user_id)
        LEFT JOIN ledger_entries e ON e.transaction_id = t.id";
    $params = [];
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' WHERE COALESCE(p.branch_id, refund_payment.branch_id) = ?';
        $params[] = (int)$actor['branch_id'];
    }
    $sql .= " GROUP BY t.id, r.id, p.id, refund_payment.id, u.name, p.branch_id, refund_payment.branch_id
        HAVING COUNT(e.id) < 2 OR ABS(COALESCE(SUM(e.debit), 0) - COALESCE(SUM(e.credit), 0)) > 0.01
        ORDER BY t.created_at DESC LIMIT 500";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $discrepancies = $stmt->fetchAll();
    aec_ok(['balanced' => count($discrepancies) === 0, 'discrepancies' => $discrepancies]);
}

aec_fail('Unknown payment action.', 404);
