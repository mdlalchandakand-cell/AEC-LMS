<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'list';

function aec_exam_can_manage(PDO $db, array $user): bool
{
    if ($user['role'] === 'super_admin') return true;
    $stmt = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'exams.manage' LIMIT 1");
    $stmt->execute([$user['role']]);
    return (bool)$stmt->fetchColumn();
}

function aec_exam_accessible(PDO $db, array $exam, array $user, bool $canManage): bool
{
    if ($exam['deleted_at'] !== null) return false;
    if ($exam['course_id'] !== null) {
        $course = $db->prepare('SELECT status, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $course->execute([(int)$exam['course_id']]);
        $courseRow = $course->fetch();
        if (!$courseRow || ($courseRow['status'] !== 'published' && !$canManage)) return false;
        if (!$canManage && $courseRow['branch_id'] !== null) {
            $branch = $db->prepare('SELECT is_active FROM branches WHERE id = ? LIMIT 1');
            $branch->execute([(int)$courseRow['branch_id']]);
            if (!(bool)$branch->fetchColumn()) return false;
        }
    }
    if ($canManage) return true;
    if ($exam['status'] !== 'published') return false;
    $window = $db->prepare(
        'SELECT (opens_at IS NULL OR opens_at <= NOW()) AND (closes_at IS NULL OR closes_at >= NOW())
         FROM exams WHERE id = ?'
    );
    $window->execute([(int)$exam['id']]);
    if (!(bool)$window->fetchColumn()) return false;
    if ($exam['course_id'] === null) return true;
    $stmt = $db->prepare(
        "SELECT 1 FROM course_enrollments
         WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
         LIMIT 1"
    );
    $stmt->execute([(int)$user['id'], (int)$exam['course_id']]);
    return (bool)$stmt->fetchColumn();
}

function aec_exam_date_value(mixed $value, string $field): ?string
{
    if ($value === null || $value === '') return null;
    if (!is_string($value)) aec_fail("{$field} must be a date-time string.", 422);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        aec_fail("{$field} must use YYYY-MM-DD HH:MM:SS format.", 422);
    }
    return $date->format('Y-m-d H:i:s');
}

function aec_exam_payload(array $input, bool $creating = false): array
{
    $title = trim((string)($input['title'] ?? ''));
    $description = trim((string)($input['description'] ?? ''));
    $duration = filter_var($input['duration_minutes'] ?? null, FILTER_VALIDATE_INT);
    $passMarks = $input['pass_marks'] ?? 0;
    $negative = $input['negative_mark_per_wrong'] ?? 0;
    $maxAttempts = filter_var($input['max_attempts'] ?? 1, FILTER_VALIDATE_INT);
    $status = (string)($input['status'] ?? 'draft');
    $courseId = isset($input['course_id']) && $input['course_id'] !== '' ? filter_var($input['course_id'], FILTER_VALIDATE_INT) : null;

    if ($title === '' || mb_strlen($title) > 180) aec_fail('Exam title is required and must not exceed 180 characters.', 422);
    if (mb_strlen($description) > 10000) aec_fail('Exam description cannot exceed 10,000 characters.', 422);
    if ($duration === false || $duration < 1 || $duration > 1440) aec_fail('Exam duration must be between 1 and 1,440 minutes.', 422);
    if (!is_numeric($passMarks) || (float)$passMarks < 0 || (float)$passMarks > 100000) aec_fail('Pass marks must be a valid non-negative number.', 422);
    if (!is_numeric($negative) || (float)$negative < 0 || (float)$negative > 1000) aec_fail('Negative marking must be a valid non-negative number.', 422);
    if ($maxAttempts === false || $maxAttempts < 1 || $maxAttempts > 20) aec_fail('Maximum attempts must be between 1 and 20.', 422);
    if (!in_array($status, ['draft', 'published', 'archived'], true)) aec_fail('Invalid exam status.', 422);
    if ($courseId === false || ($courseId !== null && $courseId < 1)) aec_fail('Invalid course identifier.', 422);

    $opensAt = aec_exam_date_value($input['opens_at'] ?? null, 'opens_at');
    $closesAt = aec_exam_date_value($input['closes_at'] ?? null, 'closes_at');
    if ($opensAt !== null && $closesAt !== null && strtotime($closesAt) <= strtotime($opensAt)) {
        aec_fail('The exam closing time must be later than its opening time.', 422);
    }

    return [
        'course_id' => $courseId,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'duration_minutes' => $duration,
        'pass_marks' => round((float)$passMarks, 2),
        'negative_mark_per_wrong' => round((float)$negative, 2),
        'max_attempts' => $maxAttempts,
        'status' => $status,
        'opens_at' => $opensAt,
        'closes_at' => $closesAt,
    ];
}

if ($action === 'list') {
    aec_method(['GET']);
    $viewer = aec_current_user();
    $canManage = aec_exam_can_manage($db, $viewer);
    $sql = "SELECT e.id, e.course_id, c.title AS course_title, e.title, e.description, e.duration_minutes,
        e.total_marks, e.pass_marks, e.negative_mark_per_wrong, e.max_attempts, e.status, e.opens_at, e.closes_at, e.created_at,
        (SELECT COUNT(*) FROM exam_questions q WHERE q.exam_id = e.id) AS question_count
        FROM exams e LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.deleted_at IS NULL";
    if (!$canManage) {
        $sql .= " AND e.status = 'published'
            AND (e.opens_at IS NULL OR e.opens_at <= NOW())
            AND (e.closes_at IS NULL OR e.closes_at >= NOW())
            AND (e.course_id IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce
                INNER JOIN courses enrolled_course ON enrolled_course.id = ce.course_id
                    AND enrolled_course.deleted_at IS NULL AND enrolled_course.status = 'published'
                WHERE ce.course_id = e.course_id AND ce.user_id = " . (int)$viewer['id'] . "
                  AND ce.status IN ('active', 'completed')
                  AND (enrolled_course.branch_id IS NULL OR EXISTS (
                    SELECT 1 FROM branches active_branch
                    WHERE active_branch.id = enrolled_course.branch_id AND active_branch.is_active = 1
                  ))
            ))";
    }
    $sql .= ' ORDER BY e.created_at DESC, e.id DESC';
    $stmt = $db->query($sql);
    aec_ok($stmt->fetchAll());
}

if ($action === 'detail') {
    aec_method(['GET']);
    $viewer = aec_current_user();
    $canManage = aec_exam_can_manage($db, $viewer);
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid exam identifier is required.', 422);
    $stmt = $db->prepare(
        'SELECT e.*, c.title AS course_title FROM exams e
         LEFT JOIN courses c ON c.id = e.course_id
         WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([$id]);
    $exam = $stmt->fetch();
    if (!$exam || !aec_exam_accessible($db, $exam, $viewer, $canManage)) aec_fail('Exam not found or not available to this account.', 404);

    $questions = $db->prepare(
        'SELECT q.id, q.question, q.options, q.correct_option_index, q.explanation, q.marks, q.sort_order,
                source.question_bank_item_id
         FROM exam_questions q
         LEFT JOIN exam_question_bank_sources source ON source.exam_question_id = q.id
         WHERE q.exam_id = ? ORDER BY q.sort_order ASC, q.id ASC'
    );
    $questions->execute([$id]);
    $exam['questions'] = [];
    foreach ($questions->fetchAll() as $question) {
        $question['options'] = json_decode((string)$question['options'], true) ?: [];
        if (!$canManage) {
            unset($question['correct_option_index'], $question['explanation']);
        }
        $exam['questions'][] = $question;
    }
    aec_ok($exam);
}

if ($action === 'attempts') {
    aec_method(['GET']);
    $viewer = aec_current_user();
    $canManage = aec_exam_can_manage($db, $viewer);
    $examId = filter_input(INPUT_GET, 'exam_id', FILTER_VALIDATE_INT);
    $sql = 'SELECT a.id, a.exam_id, e.title AS exam_title, a.user_id, u.name AS student_name, a.started_at, a.expires_at, a.submitted_at, a.score, a.total_marks, a.percentage, a.passed, a.status FROM exam_attempts a INNER JOIN exams e ON e.id = a.exam_id INNER JOIN users u ON u.id = a.user_id';
    $where = [];
    $params = [];
    if (!$canManage) {
        $where[] = 'a.user_id = ?';
        $params[] = (int)$viewer['id'];
    } elseif ($examId) {
        $where[] = 'a.exam_id = ?';
        $params[] = $examId;
    }
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY a.started_at DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create' || $action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('exams.manage');
    aec_csrf_check();
    $input = aec_input();
    $payload = aec_exam_payload($input);
    if ($payload['course_id'] !== null) {
        $courseCheck = $db->prepare('SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL');
        $courseCheck->execute([$payload['course_id']]);
        if (!$courseCheck->fetch()) aec_fail('Selected course was not found.', 404);
    }

    if ($action === 'create') {
        if ($payload['status'] === 'published') aec_fail('Create the exam as a draft, add questions, then publish it.', 422);
        $stmt = $db->prepare(
            'INSERT INTO exams (course_id, title, description, duration_minutes, pass_marks, negative_mark_per_wrong, max_attempts, status, opens_at, closes_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['course_id'], $payload['title'], $payload['description'], $payload['duration_minutes'],
            $payload['pass_marks'], $payload['negative_mark_per_wrong'], $payload['max_attempts'],
            $payload['status'], $payload['opens_at'], $payload['closes_at'], (int)$actor['id'],
        ]);
        aec_ok(['id' => (int)$db->lastInsertId()], 'Exam created.', 201);
    }

    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid exam identifier is required.', 422);
    $db->beginTransaction();
    try {
        // Match the exam-row lock used by attempt start so settings cannot race with a new attempt.
        $existingExam = $db->prepare('SELECT total_marks FROM exams WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE');
        $existingExam->execute([$id]);
        $existingTotal = $existingExam->fetchColumn();
        if ($existingTotal === false) aec_fail('Exam not found.', 404);
        $attemptCheck = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ?');
        $attemptCheck->execute([$id]);
        if ((int)$attemptCheck->fetchColumn() > 0) aec_fail('Exam settings cannot be changed after attempts have started.', 409);
        $questionCount = $db->prepare('SELECT COUNT(*) FROM exam_questions WHERE exam_id = ?');
        $questionCount->execute([$id]);
        if ($payload['status'] === 'published' && ((int)$questionCount->fetchColumn() < 1 || (float)$existingTotal <= 0)) {
            aec_fail('An exam needs at least one saved question before it can be published.', 422);
        }
        if ($payload['status'] === 'published' && $payload['pass_marks'] > (float)$existingTotal) aec_fail('Pass marks cannot exceed the saved exam total marks.', 422);
        $stmt = $db->prepare(
            'UPDATE exams SET course_id = ?, title = ?, description = ?, duration_minutes = ?, pass_marks = ?,
             negative_mark_per_wrong = ?, max_attempts = ?, status = ?, opens_at = ?, closes_at = ?, updated_at = NOW()
             WHERE id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([
            $payload['course_id'], $payload['title'], $payload['description'], $payload['duration_minutes'],
            $payload['pass_marks'], $payload['negative_mark_per_wrong'], $payload['max_attempts'],
            $payload['status'], $payload['opens_at'], $payload['closes_at'], $id,
        ]);
        $db->commit();
        aec_ok(['id' => (int)$id], 'Exam updated.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'save_questions') {
    aec_method(['POST']);
    aec_require_permission('exams.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid exam identifier is required.', 422);
    $input = aec_input();
    $questions = $input['questions'] ?? null;
    if (!is_array($questions) || count($questions) > 200) {
        aec_fail('Exam questions must be an array containing no more than 200 questions.', 422);
    }
    $db->beginTransaction();
    try {
        // Serialize question replacement with attempt creation on the same exam row.
        $examCheck = $db->prepare('SELECT pass_marks FROM exams WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE');
        $examCheck->execute([$id]);
        $exam = $examCheck->fetch();
        if (!$exam) aec_fail('Exam not found.', 404);
        $attemptCheck = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ?');
        $attemptCheck->execute([$id]);
        if ((int)$attemptCheck->fetchColumn() > 0) aec_fail('Questions cannot be changed after attempts have started.', 409);

        $normalized = [];
    $totalMarks = 0.0;
    foreach ($questions as $index => $question) {
        if (!is_array($question)) aec_fail('Each question must be an object.', 422);
        $text = trim((string)($question['question'] ?? ''));
        $options = $question['options'] ?? null;
        $correct = filter_var($question['correct_option_index'] ?? null, FILTER_VALIDATE_INT);
        $marks = $question['marks'] ?? 1;
        $explanation = trim((string)($question['explanation'] ?? ''));
        if ($text === '' || mb_strlen($text) > 5000) aec_fail('Question text is required and cannot exceed 5,000 characters.', 422);
        if (!is_array($options) || count($options) < 2 || count($options) > 8) aec_fail('Each question must have between 2 and 8 options.', 422);
        $cleanOptions = [];
        foreach ($options as $option) {
            if (!is_string($option) || trim($option) === '' || mb_strlen($option) > 1000) aec_fail('Every option must be non-empty text up to 1,000 characters.', 422);
            $cleanOptions[] = trim($option);
        }
        if ($correct === false || $correct < 0 || $correct >= count($cleanOptions)) aec_fail('Correct option index is invalid.', 422);
        if (!is_numeric($marks) || (float)$marks <= 0 || (float)$marks > 1000) aec_fail('Question marks must be greater than zero and no more than 1,000.', 422);
        if (mb_strlen($explanation) > 10000) aec_fail('Explanation cannot exceed 10,000 characters.', 422);
        $markValue = round((float)$marks, 2);
        $totalMarks += $markValue;
        $normalized[] = [
            'question' => $text, 'options' => $cleanOptions, 'correct' => $correct,
            'explanation' => $explanation !== '' ? $explanation : null, 'marks' => $markValue, 'sort_order' => count($normalized),
        ];
    }

        $db->prepare('DELETE FROM exam_questions WHERE exam_id = ?')->execute([$id]);
        $insert = $db->prepare(
            'INSERT INTO exam_questions (exam_id, question, options, correct_option_index, explanation, marks, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($normalized as $question) {
            $insert->execute([
                $id, $question['question'], json_encode($question['options'], JSON_UNESCAPED_UNICODE),
                $question['correct'], $question['explanation'], $question['marks'], $question['sort_order'],
            ]);
        }
        $db->prepare('UPDATE exams SET total_marks = ?, updated_at = NOW() WHERE id = ?')->execute([round($totalMarks, 2), $id]);
        $db->commit();
        aec_ok(['id' => (int)$id, 'question_count' => count($normalized), 'total_marks' => round($totalMarks, 2)], 'Exam questions saved.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'start') {
    aec_method(['POST']);
    aec_csrf_check();
    $viewer = aec_current_user();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid exam identifier is required.', 422);
    $canManage = aec_exam_can_manage($db, $viewer);

    // Serialize starts for the same exam so concurrent requests cannot exceed max_attempts.
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT * FROM exams WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE');
        $stmt->execute([$id]);
        $exam = $stmt->fetch();
        if (!$exam || !aec_exam_accessible($db, $exam, $viewer, $canManage)) {
            aec_fail('Exam not found or not available to this account.', 404);
        }
        $questionCount = $db->prepare('SELECT COUNT(*) FROM exam_questions WHERE exam_id = ?');
        $questionCount->execute([$id]);
        if ((int)$questionCount->fetchColumn() < 1) aec_fail('This exam does not have any questions yet.', 409);

        $db->prepare("UPDATE exam_attempts SET status = 'expired', updated_at = NOW() WHERE exam_id = ? AND user_id = ? AND status = 'in_progress' AND expires_at <= NOW()")
            ->execute([$id, (int)$viewer['id']]);
        $existing = $db->prepare(
            "SELECT id, started_at, expires_at, answers_json FROM exam_attempts
             WHERE exam_id = ? AND user_id = ? AND status = 'in_progress' AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1"
        );
        $existing->execute([$id, (int)$viewer['id']]);
        $attempt = $existing->fetch();
        if (!$attempt) {
            $count = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ? AND user_id = ?');
            $count->execute([$id, (int)$viewer['id']]);
            if ((int)$count->fetchColumn() >= (int)$exam['max_attempts']) {
                aec_fail('You have used all attempts allowed for this exam.', 409);
            }
            $insert = $db->prepare(
                'INSERT INTO exam_attempts (exam_id, user_id, started_at, expires_at, status)
                 VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), \'in_progress\')'
            );
            $insert->execute([$id, (int)$viewer['id'], (int)$exam['duration_minutes']]);
            $attemptId = (int)$db->lastInsertId();
            $attemptStmt = $db->prepare('SELECT id, started_at, expires_at, answers_json FROM exam_attempts WHERE id = ?');
            $attemptStmt->execute([$attemptId]);
            $attempt = $attemptStmt->fetch();
        }
        $remaining = $db->prepare('SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), expires_at)) FROM exam_attempts WHERE id = ?');
        $remaining->execute([(int)$attempt['id']]);
        $attempt['remaining_seconds'] = (int)$remaining->fetchColumn();
        $attempt['answers'] = $attempt['answers_json'] ? (json_decode((string)$attempt['answers_json'], true) ?: []) : [];
        unset($attempt['answers_json']);
        $db->commit();
        aec_ok(['attempt' => $attempt], 'Exam attempt ready.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'save_answers') {
    aec_method(['POST']);
    aec_csrf_check();
    $viewer = aec_current_user();
    $attemptId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$attemptId || $attemptId < 1) aec_fail('A valid attempt identifier is required.', 422);
    $input = aec_input();
    $answers = $input['answers'] ?? null;
    if (!is_array($answers)) aec_fail('Answers must be an object keyed by question identifier.', 422);

    // Lock the attempt row so an autosave cannot overwrite a concurrent final submission.
    $db->beginTransaction();
    try {
        $attemptStmt = $db->prepare('SELECT *, (expires_at <= NOW()) AS is_expired FROM exam_attempts WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE');
        $attemptStmt->execute([$attemptId, (int)$viewer['id']]);
        $attempt = $attemptStmt->fetch();
        if (!$attempt) aec_fail('Exam attempt not found.', 404);
        if ($attempt['status'] !== 'in_progress') aec_fail('This exam attempt is no longer editable.', 409);
        if ((int)$attempt['is_expired'] === 1) {
            $db->prepare("UPDATE exam_attempts SET status = 'expired', updated_at = NOW() WHERE id = ?")->execute([$attemptId]);
            $db->commit();
            aec_fail('Exam time has expired. The attempt was closed.', 409);
        }

        $questionStmt = $db->prepare('SELECT id, options FROM exam_questions WHERE exam_id = ?');
        $questionStmt->execute([(int)$attempt['exam_id']]);
        $allowedQuestions = [];
        foreach ($questionStmt->fetchAll() as $question) {
            $allowedQuestions[(string)$question['id']] = count(json_decode((string)$question['options'], true) ?: []);
        }
        $normalizedAnswers = [];
        foreach ($answers as $questionId => $answerIndex) {
            $questionKey = (string)$questionId;
            if (!array_key_exists($questionKey, $allowedQuestions)) aec_fail('Answer references a question outside this exam.', 422);
            $optionIndex = filter_var($answerIndex, FILTER_VALIDATE_INT);
            if ($optionIndex === false || $optionIndex < 0 || $optionIndex >= $allowedQuestions[$questionKey]) {
                aec_fail('An answer contains an invalid option index.', 422);
            }
            $normalizedAnswers[$questionKey] = $optionIndex;
        }
        $db->prepare('UPDATE exam_attempts SET answers_json = ?, updated_at = NOW() WHERE id = ?')
            ->execute([json_encode($normalizedAnswers, JSON_UNESCAPED_UNICODE), $attemptId]);
        $db->commit();
        aec_ok(['attempt_id' => (int)$attemptId, 'saved_answers' => count($normalizedAnswers)], 'Exam answers saved.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'submit') {
    aec_method(['POST']);
    aec_csrf_check();
    $viewer = aec_current_user();
    $attemptId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$attemptId || $attemptId < 1) aec_fail('A valid attempt identifier is required.', 422);
    $input = aec_input();
    $answers = $input['answers'] ?? null;
    if (!is_array($answers)) aec_fail('Answers must be an object keyed by question identifier.', 422);

    $db->beginTransaction();
    try {
        $attemptStmt = $db->prepare('SELECT *, (expires_at <= NOW()) AS is_expired FROM exam_attempts WHERE id = ? FOR UPDATE');
        $attemptStmt->execute([$attemptId]);
        $attempt = $attemptStmt->fetch();
        if (!$attempt || (int)$attempt['user_id'] !== (int)$viewer['id']) aec_fail('Exam attempt not found.', 404);
        if ($attempt['status'] !== 'in_progress') aec_fail('This exam attempt has already been submitted or expired.', 409);
        if ((int)$attempt['is_expired'] === 1) {
            $db->prepare("UPDATE exam_attempts SET status = 'expired', updated_at = NOW() WHERE id = ?")->execute([$attemptId]);
            $db->commit();
            aec_fail('Exam time has expired. The attempt was closed.', 409);
        }

        $examStmt = $db->prepare('SELECT id, total_marks, pass_marks, negative_mark_per_wrong FROM exams WHERE id = ?');
        $examStmt->execute([(int)$attempt['exam_id']]);
        $exam = $examStmt->fetch();
        $questionStmt = $db->prepare('SELECT id, options, correct_option_index, explanation, marks, question FROM exam_questions WHERE exam_id = ? ORDER BY sort_order, id');
        $questionStmt->execute([(int)$attempt['exam_id']]);
        $questions = $questionStmt->fetchAll();
        $normalizedAnswers = [];
        $review = [];
        $score = 0.0;
        foreach ($questions as $question) {
            $questionId = (string)$question['id'];
            $userAnswer = null;
            if (array_key_exists($questionId, $answers)) {
                $userAnswer = filter_var($answers[$questionId], FILTER_VALIDATE_INT);
                $options = json_decode((string)$question['options'], true) ?: [];
                if ($userAnswer === false || $userAnswer < 0 || $userAnswer >= count($options)) {
                    aec_fail('An answer contains an invalid option index.', 422);
                }
                $normalizedAnswers[$questionId] = $userAnswer;
                if ($userAnswer === (int)$question['correct_option_index']) {
                    $score += (float)$question['marks'];
                } else {
                    $score -= (float)$exam['negative_mark_per_wrong'];
                }
            }
            $review[] = [
                'question_id' => (int)$question['id'],
                'question' => $question['question'],
                'options' => json_decode((string)$question['options'], true) ?: [],
                'user_answer' => $userAnswer,
                'correct_option_index' => (int)$question['correct_option_index'],
                'explanation' => $question['explanation'],
                'marks' => (float)$question['marks'],
            ];
        }
        $score = max(0, round($score, 2));
        $totalMarks = (float)$exam['total_marks'];
        $percentage = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0.0;
        $passed = $score >= (float)$exam['pass_marks'];
        $db->prepare(
            "UPDATE exam_attempts SET submitted_at = NOW(), score = ?, total_marks = ?, percentage = ?, passed = ?,
             status = 'submitted', answers_json = ?, updated_at = NOW() WHERE id = ?"
        )->execute([
            $score, $totalMarks, $percentage, $passed ? 1 : 0,
            json_encode($normalizedAnswers, JSON_UNESCAPED_UNICODE), $attemptId,
        ]);
        $db->commit();
        aec_ok([
            'id' => (int)$attemptId, 'exam_id' => (int)$attempt['exam_id'], 'score' => $score,
            'total_marks' => $totalMarks, 'percentage' => $percentage, 'passed' => $passed,
            'answers' => $normalizedAnswers, 'review' => $review,
        ], 'Exam submitted and graded.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'delete') {
    aec_method(['POST']);
    aec_require_permission('exams.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid exam identifier is required.', 422);
    $db->beginTransaction();
    try {
        $exists = $db->prepare('SELECT id FROM exams WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE');
        $exists->execute([$id]);
        if (!$exists->fetch()) aec_fail('Exam not found.', 404);
        $attemptCheck = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ?');
        $attemptCheck->execute([$id]);
        if ((int)$attemptCheck->fetchColumn() > 0) aec_fail('An exam with attempts cannot be archived.', 409);
        $stmt = $db->prepare('UPDATE exams SET deleted_at = NOW(), status = \'archived\', updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $db->commit();
        aec_ok(['id' => (int)$id], 'Exam archived.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

aec_fail('Unknown exam action.', 404);
