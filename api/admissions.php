<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'submit';

if ($action === 'submit') {
    aec_method(['POST']);
    $input = aec_input();
    if (trim((string)($input['website'] ?? '')) !== '') aec_fail('Invalid application request.', 422);

    $name = trim((string)($input['name'] ?? ''));
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $phone = trim((string)($input['phone'] ?? ''));
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $branchLabel = trim((string)($input['branch_label'] ?? ''));
    $preferredContact = (string)($input['preferred_contact'] ?? 'phone');
    $message = trim((string)($input['message'] ?? ''));

    if ($name === '' || mb_strlen($name) > 160) aec_fail('Enter your name (maximum 160 characters).', 422);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) aec_fail('Enter a valid email address.', 422);
    if ($phone === '' || mb_strlen($phone) > 32) aec_fail('Enter a valid phone number.', 422);
    if (!$courseId || $courseId < 1) aec_fail('Choose a valid course.', 422);
    if ($branchLabel !== '' && mb_strlen($branchLabel) > 120) aec_fail('Branch name is too long.', 422);
    if (!in_array($preferredContact, ['phone','email'], true)) aec_fail('Choose a valid contact preference.', 422);
    if (mb_strlen($message) > 2000) aec_fail('Your message cannot exceed 2,000 characters.', 422);

    $course = $db->prepare("SELECT id FROM courses WHERE id = ? AND status = 'published' AND deleted_at IS NULL LIMIT 1");
    $course->execute([$courseId]);
    if (!$course->fetch()) aec_fail('The selected course is not available for admission.', 404);

    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    $ipCount = $db->prepare('SELECT COUNT(*) FROM admission_applications WHERE ip_address = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)');
    $ipCount->execute([$ip]);
    if ((int)$ipCount->fetchColumn() >= 5) aec_fail('Too many applications were submitted from this network. Please try again later.', 429);
    $emailCount = $db->prepare('SELECT COUNT(*) FROM admission_applications WHERE email = ? AND created_at > (NOW() - INTERVAL 1 DAY)');
    $emailCount->execute([$email]);
    if ((int)$emailCount->fetchColumn() >= 3) aec_fail('This email address has reached the daily application limit.', 429);

    $reference = 'AEC-ADM-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
    $stmt = $db->prepare(
        "INSERT INTO admission_applications
         (reference_code, applicant_name, email, phone, course_id, branch_label, preferred_contact, message, status, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
    );
    $stmt->execute([$reference, $name, $email, $phone, $courseId, $branchLabel ?: null, $preferredContact, $message ?: null, $ip]);
    aec_ok(['reference_code' => $reference, 'status' => 'pending'], 'Your admission inquiry has been received. This is not an enrollment or payment confirmation.', 201);
}

if ($action === 'list') {
    aec_method(['GET']);
    aec_require_permission('admissions.manage');
    $status = trim((string)($_GET['status'] ?? ''));
    $sql = 'SELECT a.id, a.reference_code, a.applicant_name, a.email, a.phone, a.course_id, c.title AS course_title,
                   a.branch_label, a.preferred_contact, a.message, a.status, a.created_at, a.reviewed_at, a.review_notes
            FROM admission_applications a
            INNER JOIN courses c ON c.id = a.course_id';
    $params = [];
    if ($status !== '') {
        if (!in_array($status, ['pending','contacted','rejected'], true)) aec_fail('Invalid application status filter.', 422);
        $sql .= ' WHERE a.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY a.created_at DESC, a.id DESC LIMIT 300';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('admissions.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid application identifier is required.', 422);
    $input = aec_input();
    $status = (string)($input['status'] ?? '');
    $notes = trim((string)($input['review_notes'] ?? ''));
    if (!in_array($status, ['pending','contacted','rejected'], true)) aec_fail('Invalid application status.', 422);
    if (mb_strlen($notes) > 1000) aec_fail('Review notes cannot exceed 1,000 characters.', 422);
    $exists = $db->prepare('SELECT id FROM admission_applications WHERE id = ? LIMIT 1');
    $exists->execute([$id]);
    if (!$exists->fetch()) aec_fail('Admission application not found.', 404);
    $db->prepare(
        'UPDATE admission_applications SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?'
    )->execute([$status, $notes ?: null, (int)$actor['id'], $id]);
    $audit = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $audit->execute([
        (int)$actor['id'], 'admission.application.updated', 'admission_application', (int)$id,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode(['status' => $status]),
    ]);
    aec_ok(['id' => (int)$id, 'status' => $status], 'Admission application updated.');
}

aec_fail('Unknown admission action.', 404);
