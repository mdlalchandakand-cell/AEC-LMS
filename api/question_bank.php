<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'list';

function aec_question_bank_payload(array $input): array
{
    $category = trim((string)($input['category'] ?? 'General'));
    $question = trim((string)($input['question_text'] ?? ''));
    $options = $input['options'] ?? null;
    $correct = filter_var($input['correct_option_index'] ?? null, FILTER_VALIDATE_INT);
    $explanation = trim((string)($input['explanation'] ?? ''));
    $marks = $input['marks'] ?? 1;
    $difficulty = (string)($input['difficulty'] ?? 'intermediate');
    $status = (string)($input['status'] ?? 'draft');
    $tags = $input['tags'] ?? [];

    if ($category === '' || mb_strlen($category) > 120) aec_fail('Question category is required and must not exceed 120 characters.', 422);
    if ($question === '' || mb_strlen($question) > 5000) aec_fail('Question text is required and cannot exceed 5,000 characters.', 422);
    if (!is_array($options) || count($options) < 2 || count($options) > 8) aec_fail('A question must have between 2 and 8 options.', 422);
    $cleanOptions = [];
    foreach ($options as $option) {
        if (!is_string($option) || trim($option) === '' || mb_strlen($option) > 1000) aec_fail('Each option must be non-empty text up to 1,000 characters.', 422);
        $cleanOptions[] = trim($option);
    }
    if ($correct === false || $correct < 0 || $correct >= count($cleanOptions)) aec_fail('Correct option index is invalid.', 422);
    if (mb_strlen($explanation) > 10000) aec_fail('Explanation cannot exceed 10,000 characters.', 422);
    if (!is_numeric($marks) || (float)$marks <= 0 || (float)$marks > 1000) aec_fail('Marks must be greater than zero and no more than 1,000.', 422);
    if (!in_array($difficulty, ['beginner', 'intermediate', 'advanced'], true)) aec_fail('Invalid question difficulty.', 422);
    if (!in_array($status, ['draft', 'published', 'archived'], true)) aec_fail('Invalid question status.', 422);
    if (!is_array($tags) || count($tags) > 20) aec_fail('Tags must be an array of up to 20 values.', 422);
    $cleanTags = [];
    foreach ($tags as $tag) {
        if (!is_string($tag) || trim($tag) === '' || mb_strlen($tag) > 40) aec_fail('Each tag must be non-empty text up to 40 characters.', 422);
        $cleanTags[] = trim($tag);
    }

    return [
        'category' => $category,
        'question_text' => $question,
        'options' => $cleanOptions,
        'correct_option_index' => $correct,
        'explanation' => $explanation !== '' ? $explanation : null,
        'marks' => round((float)$marks, 2),
        'difficulty' => $difficulty,
        'tags' => array_values(array_unique($cleanTags)),
        'status' => $status,
    ];
}

if ($action === 'list') {
    aec_method(['GET']);
    aec_require_permission('question_bank.manage');
    $stmt = $db->query(
        'SELECT id, category, question_text, options, correct_option_index, explanation, marks,
                difficulty, tags, status, created_at
         FROM question_bank_items WHERE deleted_at IS NULL ORDER BY category, created_at DESC, id DESC'
    );
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['id'] = (int)$row['id'];
        $row['options'] = json_decode((string)$row['options'], true) ?: [];
        $row['correct_option_index'] = (int)$row['correct_option_index'];
        $row['marks'] = (float)$row['marks'];
        $row['tags'] = $row['tags'] ? (json_decode((string)$row['tags'], true) ?: []) : [];
    }
    unset($row);
    aec_ok($rows);
}

if ($action === 'detail') {
    aec_method(['GET']);
    aec_require_permission('question_bank.manage');
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid question identifier is required.', 422);
    $stmt = $db->prepare(
        'SELECT id, category, question_text, options, correct_option_index, explanation, marks,
                difficulty, tags, status, created_at
         FROM question_bank_items WHERE id = ? AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) aec_fail('Question not found.', 404);
    $row['id'] = (int)$row['id'];
    $row['options'] = json_decode((string)$row['options'], true) ?: [];
    $row['correct_option_index'] = (int)$row['correct_option_index'];
    $row['marks'] = (float)$row['marks'];
    $row['tags'] = $row['tags'] ? (json_decode((string)$row['tags'], true) ?: []) : [];
    aec_ok($row);
}

if ($action === 'create' || $action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('question_bank.manage');
    aec_csrf_check();
    $payload = aec_question_bank_payload(aec_input());
    if ($action === 'create') {
        $stmt = $db->prepare(
            'INSERT INTO question_bank_items (category, question_text, options, correct_option_index, explanation, marks, difficulty, tags, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['category'], $payload['question_text'], json_encode($payload['options'], JSON_UNESCAPED_UNICODE),
            $payload['correct_option_index'], $payload['explanation'], $payload['marks'], $payload['difficulty'],
            json_encode($payload['tags'], JSON_UNESCAPED_UNICODE), $payload['status'], (int)$actor['id'],
        ]);
        aec_ok(['id' => (int)$db->lastInsertId()], 'Question added to bank.', 201);
    }

    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid question identifier is required.', 422);
    if ($payload['status'] !== 'published') {
        $linked = $db->prepare('SELECT COUNT(*) FROM exam_question_bank_sources WHERE question_bank_item_id = ?');
        $linked->execute([$id]);
        if ((int)$linked->fetchColumn() > 0) aec_fail('A question already used in an exam must remain published for safe exam editing.', 409);
    }
    $stmt = $db->prepare(
        'UPDATE question_bank_items SET category = ?, question_text = ?, options = ?, correct_option_index = ?,
         explanation = ?, marks = ?, difficulty = ?, tags = ?, status = ?, updated_at = NOW()
         WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->execute([
        $payload['category'], $payload['question_text'], json_encode($payload['options'], JSON_UNESCAPED_UNICODE),
        $payload['correct_option_index'], $payload['explanation'], $payload['marks'], $payload['difficulty'],
        json_encode($payload['tags'], JSON_UNESCAPED_UNICODE), $payload['status'], $id,
    ]);
    if (!$stmt->rowCount()) {
        $exists = $db->prepare('SELECT id FROM question_bank_items WHERE id = ? AND deleted_at IS NULL');
        $exists->execute([$id]);
        if (!$exists->fetch()) aec_fail('Question not found.', 404);
    }
    aec_ok(['id' => (int)$id], 'Question updated.');
}

if ($action === 'add_to_exam') {
    aec_method(['POST']);
    aec_require_permission('exams.manage');
    aec_require_permission('question_bank.manage');
    aec_csrf_check();
    $examId = filter_input(INPUT_GET, 'exam_id', FILTER_VALIDATE_INT);
    if (!$examId || $examId < 1) aec_fail('A valid exam identifier is required.', 422);
    $input = aec_input();
    $questionIds = $input['question_bank_ids'] ?? null;
    if (!is_array($questionIds) || count($questionIds) < 1 || count($questionIds) > 200) {
        aec_fail('Select between 1 and 200 question bank items.', 422);
    }
    $cleanIds = [];
    foreach ($questionIds as $value) {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) aec_fail('Question bank identifiers must be positive integers.', 422);
        if (in_array($id, $cleanIds, true)) aec_fail('A question cannot be selected more than once.', 422);
        $cleanIds[] = $id;
    }

    $examStmt = $db->prepare("SELECT id, total_marks, status FROM exams WHERE id = ? AND deleted_at IS NULL");
    $examStmt->execute([$examId]);
    $exam = $examStmt->fetch();
    if (!$exam) aec_fail('Exam not found.', 404);
    if ($exam['status'] !== 'draft') aec_fail('Question bank items can only be added to draft exams.', 409);
    $attemptCheck = $db->prepare('SELECT COUNT(*) FROM exam_attempts WHERE exam_id = ?');
    $attemptCheck->execute([$examId]);
    if ((int)$attemptCheck->fetchColumn() > 0) aec_fail('Questions cannot be changed after an attempt has started.', 409);

    $existingSource = $db->prepare('SELECT COUNT(*) FROM exam_question_bank_sources WHERE exam_id = ? AND question_bank_item_id = ?');
    foreach ($cleanIds as $questionBankId) {
        $existingSource->execute([$examId, $questionBankId]);
        if ((int)$existingSource->fetchColumn() > 0) aec_fail('A selected question is already linked to this exam.', 409);
    }

    $db->beginTransaction();
    try {
        $existingOrder = $db->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM exam_questions WHERE exam_id = ?');
        $existingOrder->execute([$examId]);
        $sortOrder = (int)$existingOrder->fetchColumn() + 1;
        $selectQuestion = $db->prepare(
            "SELECT id, question_text, options, correct_option_index, explanation, marks
             FROM question_bank_items WHERE id = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1"
        );
        $insertQuestion = $db->prepare(
            'INSERT INTO exam_questions (exam_id, question, options, correct_option_index, explanation, marks, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $insertSource = $db->prepare(
            'INSERT INTO exam_question_bank_sources (exam_id, exam_question_id, question_bank_item_id) VALUES (?, ?, ?)'
        );
        $newTotal = (float)$exam['total_marks'];
        foreach ($cleanIds as $questionBankId) {
            $selectQuestion->execute([$questionBankId]);
            $question = $selectQuestion->fetch();
            if (!$question) aec_fail('A selected published question bank item was not found.', 404);
            $insertQuestion->execute([
                $examId, $question['question_text'], $question['options'], $question['correct_option_index'],
                $question['explanation'], $question['marks'], $sortOrder++,
            ]);
            $examQuestionId = (int)$db->lastInsertId();
            $insertSource->execute([$examId, $examQuestionId, $questionBankId]);
            $newTotal += (float)$question['marks'];
        }
        $db->prepare('UPDATE exams SET total_marks = ?, updated_at = NOW() WHERE id = ?')->execute([round($newTotal, 2), $examId]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    aec_ok(['exam_id' => $examId, 'imported_count' => count($cleanIds), 'total_marks' => round($newTotal, 2)], 'Question bank items added to exam.');
}

if ($action === 'delete') {
    aec_method(['POST']);
    aec_require_permission('question_bank.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid question identifier is required.', 422);
    $linked = $db->prepare('SELECT COUNT(*) FROM exam_question_bank_sources WHERE question_bank_item_id = ?');
    $linked->execute([$id]);
    if ((int)$linked->fetchColumn() > 0) aec_fail('A question already used in an exam cannot be archived.', 409);
    $stmt = $db->prepare("UPDATE question_bank_items SET status = 'archived', deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$id]);
    if (!$stmt->rowCount()) aec_fail('Question not found.', 404);
    aec_ok(['id' => (int)$id], 'Question archived.');
}

aec_fail('Unknown question bank action.', 404);
