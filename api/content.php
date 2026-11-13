<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'list';

/**
 * Linked course content is public only when an eligible published-course preview
 * exists; otherwise it requires enrollment or course/content management permission.
 */
function aec_content_can_view(PDO $db, int $contentId): bool
{
    $links = $db->prepare(
        'SELECT
            COUNT(*) AS total_links,
            SUM(CASE
                WHEN cc.is_preview = 1
                 AND course.status = \'published\'
                 AND course.deleted_at IS NULL
                 AND (course.branch_id IS NULL OR EXISTS (
                     SELECT 1 FROM branches active_branch
                     WHERE active_branch.id = course.branch_id AND active_branch.is_active = 1
                 ))
                THEN 1 ELSE 0
            END) AS public_preview_links
         FROM course_content cc
         LEFT JOIN courses course ON course.id = cc.course_id
         WHERE cc.content_item_id = ?'
    );
    $links->execute([$contentId]);
    $linkState = $links->fetch();

    // Standalone content is public; linked content is public only through a
    // preview attached to a published course in an active branch.
    if ((int)$linkState['total_links'] === 0 || (int)$linkState['public_preview_links'] > 0) {
        return true;
    }

    if (empty($_SESSION['user_id'])) {
        return false;
    }

    $viewer = aec_current_user();
    if ($viewer['role'] === 'super_admin') {
        return true;
    }

    $permission = $db->prepare(
        "SELECT COUNT(*) FROM role_permissions
         WHERE role = ? AND permission_key IN ('courses.manage', 'content.manage') AND allowed = 1"
    );
    $permission->execute([$viewer['role']]);
    if ((int)$permission->fetchColumn() > 0) {
        return true;
    }

    $enrollment = $db->prepare(
        "SELECT 1 FROM course_content cc
         JOIN course_enrollments e ON e.course_id = cc.course_id
         WHERE cc.content_item_id = ? AND e.user_id = ?
           AND e.status IN ('active', 'completed')
         LIMIT 1"
    );
    $enrollment->execute([$contentId, (int)$viewer['id']]);
    return (bool)$enrollment->fetchColumn();
}

function aec_can_track_course_progress(PDO $db, int $courseId, array $viewer): bool
{
    $course = $db->prepare('SELECT status FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $course->execute([$courseId]);
    $courseStatus = $course->fetchColumn();
    if ($courseStatus === false) return false;

    $canManage = $viewer['role'] === 'super_admin';
    if (!$canManage) {
        $permission = $db->prepare(
            "SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'courses.manage' LIMIT 1"
        );
        $permission->execute([$viewer['role']]);
        $canManage = (bool)$permission->fetchColumn();
    }
    if ($courseStatus !== 'published' && !$canManage) return false;
    if ($canManage) return true;

    $enrollment = $db->prepare(
        "SELECT 1 FROM course_enrollments
         WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
         LIMIT 1"
    );
    $enrollment->execute([(int)$viewer['id'], $courseId]);
    return (bool)$enrollment->fetchColumn();
}

if ($action === 'progress') {
    aec_method(['GET']);
    $viewer = aec_current_user();
    $courseId = filter_input(INPUT_GET, 'course_id', FILTER_VALIDATE_INT);
    if (!$courseId || $courseId < 1) aec_fail('A valid course identifier is required.', 422);
    if (!aec_can_track_course_progress($db, $courseId, $viewer)) aec_fail('Active course enrollment is required to view progress.', 403);
    $stmt = $db->prepare(
        'SELECT content_item_id, is_completed, notes, updated_at
         FROM course_lesson_progress WHERE user_id = ? AND course_id = ?
         ORDER BY content_item_id ASC'
    );
    $stmt->execute([(int)$viewer['id'], $courseId]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'progress_update') {
    aec_method(['POST']);
    aec_csrf_check();
    $viewer = aec_current_user();
    $input = aec_input();
    $courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
    $contentId = filter_var($input['content_item_id'] ?? null, FILTER_VALIDATE_INT);
    $isCompleted = array_key_exists('is_completed', $input)
        ? filter_var($input['is_completed'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
        : null;
    $rawNotes = $input['notes'] ?? '';
    if (!$courseId || $courseId < 1 || !$contentId || $contentId < 1 || $isCompleted === null || !is_string($rawNotes)) {
        aec_fail('Course, lesson, completion and note values are required.', 422);
    }
    $notes = trim($rawNotes);
    if (mb_strlen($notes) > 10000) aec_fail('Lesson notes cannot exceed 10,000 characters.', 422);
    if (!aec_can_track_course_progress($db, $courseId, $viewer)) aec_fail('Active course enrollment is required to save progress.', 403);

    $linked = $db->prepare(
        "SELECT 1 FROM course_content cc
         INNER JOIN content_items ci ON ci.id = cc.content_item_id
         WHERE cc.course_id = ? AND cc.content_item_id = ?
           AND ci.deleted_at IS NULL AND ci.status = 'published'
         LIMIT 1"
    );
    $linked->execute([$courseId, $contentId]);
    if (!$linked->fetch()) aec_fail('Published lesson was not found in this course.', 404);

    $stmt = $db->prepare(
        'INSERT INTO course_lesson_progress (user_id, course_id, content_item_id, is_completed, notes)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), notes = VALUES(notes), updated_at = NOW()'
    );
    $stmt->execute([(int)$viewer['id'], $courseId, $contentId, $isCompleted ? 1 : 0, $notes !== '' ? $notes : null]);
    aec_ok(['course_id' => $courseId, 'content_item_id' => $contentId, 'is_completed' => $isCompleted, 'notes' => $notes], 'Lesson progress saved.');
}

if ($action === 'links') {
    aec_method(['GET']);
    aec_require_permission('content.manage');
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid content identifier is required.', 422);
    $stmt = $db->prepare(
        'SELECT cc.course_id, course.title AS course_title, cc.sort_order, cc.is_preview
         FROM course_content cc
         INNER JOIN courses course ON course.id = cc.course_id
         WHERE cc.content_item_id = ? AND course.deleted_at IS NULL
         ORDER BY cc.sort_order ASC, cc.id ASC'
    );
    $stmt->execute([$id]);
    aec_ok($stmt->fetchAll());
}

if ($action === 'list') {
    aec_method(['GET']);
    $type = $_GET['type'] ?? null;
    $public = ($_GET['public'] ?? '') === '1';
    if (!$public) aec_require_permission('content.manage');
    $linkedCourseVisibility = $public
        ? " AND linked_course.status = 'published'
            AND (linked_course.branch_id IS NULL OR EXISTS (
                SELECT 1 FROM branches active_branch
                WHERE active_branch.id = linked_course.branch_id AND active_branch.is_active = 1
            ))"
        : '';
    $sql = 'SELECT id, title, content_type, body, media_url, duration_minutes, status, created_at,
        (SELECT cc.course_id FROM course_content cc
         INNER JOIN courses linked_course ON linked_course.id = cc.course_id
         WHERE cc.content_item_id = content_items.id AND linked_course.deleted_at IS NULL' . ($public ? ' AND cc.is_preview = 1' : '') . $linkedCourseVisibility . '
         ORDER BY cc.is_preview DESC, cc.sort_order ASC, cc.id ASC LIMIT 1) AS course_id,
        (SELECT linked_course.title FROM course_content cc
         INNER JOIN courses linked_course ON linked_course.id = cc.course_id
         WHERE cc.content_item_id = content_items.id AND linked_course.deleted_at IS NULL' . ($public ? ' AND cc.is_preview = 1' : '') . $linkedCourseVisibility . '
         ORDER BY cc.is_preview DESC, cc.sort_order ASC, cc.id ASC LIMIT 1) AS course_title
        FROM content_items WHERE deleted_at IS NULL';
    $params = [];
    if ($public) {
        $sql .= " AND status = 'published'
            AND (
                NOT EXISTS (SELECT 1 FROM course_content linked WHERE linked.content_item_id = content_items.id)
                OR EXISTS (
                    SELECT 1 FROM course_content preview
                    INNER JOIN courses preview_course ON preview_course.id = preview.course_id
                    WHERE preview.content_item_id = content_items.id
                      AND preview.is_preview = 1
                      AND preview_course.deleted_at IS NULL
                      AND preview_course.status = 'published'
                      AND (preview_course.branch_id IS NULL OR EXISTS (
                          SELECT 1 FROM branches active_branch
                          WHERE active_branch.id = preview_course.branch_id AND active_branch.is_active = 1
                      ))
                )
            )";
    }
    if (in_array($type, ['lesson','video','article','file','quiz'], true)) {
        $sql .= ' AND content_type = ?';
        $params[] = $type;
    }
    $sql .= ' ORDER BY created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'detail') {
    aec_method(['GET']);
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid content id is required.', 422);
    $stmt = $db->prepare('SELECT id, title, content_type, body, media_url, duration_minutes, status, created_at FROM content_items WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    if (!$item || ($item['status'] !== 'published' && !isset($_SESSION['user_id']))) aec_fail('Content not found.', 404);
    if ($item['status'] !== 'published') {
        aec_require_permission('content.manage');
    } elseif (!aec_content_can_view($db, (int)$id)) {
        aec_fail('Content not found.', 404);
    }
    aec_ok($item);
}

if (in_array($action, ['create','update','delete','attach','detach','sync_links'], true)) {
    aec_method(['POST']);
    aec_require_permission('content.manage');
    aec_csrf_check();
    $input = aec_input();

    if ($action === 'sync_links') {
        aec_require_permission('courses.manage');
        $contentId = filter_var($input['content_item_id'] ?? null, FILTER_VALIDATE_INT);
        $links = $input['links'] ?? null;
        if (!$contentId || $contentId < 1 || !is_array($links) || count($links) > 100) {
            aec_fail('A valid content identifier and up to 100 course links are required.', 422);
        }
        $contentCheck = $db->prepare('SELECT id FROM content_items WHERE id = ? AND deleted_at IS NULL');
        $contentCheck->execute([$contentId]);
        if (!$contentCheck->fetch()) aec_fail('Content not found.', 404);

        $normalizedLinks = [];
        $seenCourseIds = [];
        foreach ($links as $link) {
            if (!is_array($link)) aec_fail('Each course link must be an object.', 422);
            $courseId = filter_var($link['course_id'] ?? null, FILTER_VALIDATE_INT);
            $sortOrder = filter_var($link['sort_order'] ?? 0, FILTER_VALIDATE_INT);
            if (!$courseId || $courseId < 1 || $sortOrder === false || $sortOrder < 0) {
                aec_fail('Course identifiers and sort order must be valid non-negative integers.', 422);
            }
            if (isset($seenCourseIds[$courseId])) aec_fail('A course can only be linked once to the same content item.', 422);
            $seenCourseIds[$courseId] = true;
            $courseCheck = $db->prepare('SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL');
            $courseCheck->execute([$courseId]);
            if (!$courseCheck->fetch()) aec_fail('One of the selected courses was not found.', 404);
            $normalizedLinks[] = [$courseId, $contentId, $sortOrder, !empty($link['is_preview']) ? 1 : 0];
        }

        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM course_content WHERE content_item_id = ?')->execute([$contentId]);
            if ($normalizedLinks) {
                $insert = $db->prepare('INSERT INTO course_content (course_id, content_item_id, sort_order, is_preview) VALUES (?, ?, ?, ?)');
                foreach ($normalizedLinks as $linkValues) $insert->execute($linkValues);
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
        aec_ok(['content_item_id' => $contentId, 'linked_courses' => count($normalizedLinks)], 'Course links saved.');
    }

    if ($action === 'attach' || $action === 'detach') {
        aec_require_permission('courses.manage');
        $courseId = (int)($input['course_id'] ?? 0);
        $contentId = (int)($input['content_item_id'] ?? 0);
        if ($courseId < 1 || $contentId < 1) aec_fail('Course and content identifiers are required.', 422);
        $check = $db->prepare('SELECT id FROM courses WHERE id=? AND deleted_at IS NULL');
        $check->execute([$courseId]);
        if (!$check->fetch()) aec_fail('Course not found.', 404);
        $check = $db->prepare('SELECT id FROM content_items WHERE id=? AND deleted_at IS NULL');
        $check->execute([$contentId]);
        if (!$check->fetch()) aec_fail('Content not found.', 404);
        if ($action === 'attach') {
            $stmt = $db->prepare('INSERT INTO course_content (course_id, content_item_id, sort_order, is_preview) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE sort_order=VALUES(sort_order), is_preview=VALUES(is_preview)');
            $stmt->execute([$courseId, $contentId, max(0, (int)($input['sort_order'] ?? 0)), !empty($input['is_preview']) ? 1 : 0]);
            aec_ok(null, 'Content linked to course.');
        }
        $stmt = $db->prepare('DELETE FROM course_content WHERE course_id=? AND content_item_id=?');
        $stmt->execute([$courseId, $contentId]);
        aec_ok(null, 'Content unlinked from course.');
    }

    if ($action === 'delete') {
        $actor = aec_require_permission('content.manage');
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) aec_fail('A valid content id is required.', 422);
        $db->beginTransaction();
        try {
            $select = $db->prepare('SELECT id, title, content_type, status, created_by FROM content_items WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE');
            $select->execute([$id]); $content = $select->fetch();
            if (!$content) aec_fail('Content not found.', 404);
            $update = $db->prepare('UPDATE content_items SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
            $update->execute([$id]);
            if ($update->rowCount() !== 1) aec_fail('Content item is already deleted.', 409);
            aec_recycle_bin_record($db, $actor, 'content', (int)$id, (string)$content['title'], null, [
                'status' => $content['status'], 'content_type' => $content['content_type'], 'created_by' => $content['created_by'],
            ]);
            $db->commit();
            aec_ok(['id' => (int)$id], 'Content moved to recycle bin.');
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
    }

    $title = trim((string)($input['title'] ?? ''));
    $type = (string)($input['content_type'] ?? 'lesson');
    $status = (string)($input['status'] ?? 'draft');
    if ($title === '' || mb_strlen($title) > 180) aec_fail('A title is required (maximum 180 characters).', 422);
    if (!in_array($type, ['lesson','video','article','file','quiz'], true)) aec_fail('Invalid content type.', 422);
    if (!in_array($status, ['draft','published','archived'], true)) aec_fail('Invalid content status.', 422);
    $body = (string)($input['body'] ?? '');
    $media = trim((string)($input['media_url'] ?? ''));
    if ($media !== '' && !filter_var($media, FILTER_VALIDATE_URL)) aec_fail('Media URL must be a valid absolute URL.', 422);
    $duration = max(0, min(65535, (int)($input['duration_minutes'] ?? 0)));

    if ($action === 'create') {
        $stmt = $db->prepare('INSERT INTO content_items (title, content_type, body, media_url, duration_minutes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$title, $type, $body, $media ?: null, $duration, $status, aec_current_user()['id']]);
        aec_ok(['id' => (int)$db->lastInsertId()], 'Content created.', 201);
    }
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid content id is required.', 422);
    $stmt = $db->prepare('UPDATE content_items SET title=?, content_type=?, body=?, media_url=?, duration_minutes=?, status=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL');
    $stmt->execute([$title, $type, $body, $media ?: null, $duration, $status, $id]);
    $check = $db->prepare('SELECT id FROM content_items WHERE id=? AND deleted_at IS NULL');
    $check->execute([$id]);
    if (!$check->fetch()) aec_fail('Content not found.', 404);
    aec_ok(['id' => $id], 'Content updated.');
}

aec_fail('Unknown content action.', 404);
