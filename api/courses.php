<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
$db = aec_db();
$action = $_GET['action'] ?? 'list';

if ($action === 'list') {
    aec_method(['GET']);
    $canManageCourses = false;
    if (!empty($_SESSION['user_id'])) {
        $viewer = aec_current_user();
        aec_assert_active_branch($db, $viewer);
        if ($viewer['role'] === 'super_admin') {
            $canManageCourses = true;
        } else {
            $permission = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'courses.manage' LIMIT 1");
            $permission->execute([$viewer['role']]);
            $canManageCourses = (bool)$permission->fetchColumn();
        }
    }

    $sql = "SELECT c.id, c.category_id, c.branch_id, category.name AS category_name, c.title, c.slug, c.subtitle, c.description,
        c.price, c.original_price, c.level, c.duration_weeks, c.thumbnail, c.status, c.created_at,
        (SELECT COUNT(*) FROM course_content cc WHERE cc.course_id = c.id) AS content_count
        FROM courses c
        LEFT JOIN course_categories category ON category.id = c.category_id
        WHERE c.deleted_at IS NULL";
    $params = [];
    if (($viewer['role'] ?? '') === 'branch_manager') {
        if (empty($viewer['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        $sql .= ' AND c.branch_id = ?';
        $params[] = (int)$viewer['branch_id'];
    } elseif (!$canManageCourses) {
        $sql .= " AND c.status = 'published' AND (c.branch_id IS NULL OR EXISTS (SELECT 1 FROM branches active_branch WHERE active_branch.id = c.branch_id AND active_branch.is_active = 1))";
        if (($viewer['role'] ?? '') === 'student') {
            $sql .= ' AND (c.branch_id IS NULL OR c.branch_id = ?)';
            $params[] = !empty($viewer['branch_id']) ? (int)$viewer['branch_id'] : 0;
        }
    }
    $sql .= ' ORDER BY c.created_at DESC, c.id DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'detail') {
    aec_method(['GET']);
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid course id is required.', 422);
    $stmt = $db->prepare('SELECT id, category_id, branch_id, title, slug, subtitle, description, price, original_price, level, duration_weeks, thumbnail, status, created_at FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$id]);
    $course = $stmt->fetch();
    if (!$course) aec_fail('Course not found.', 404);
    // Draft and archived courses are visible only to course managers.
    // Course previews are public; full lesson bodies and media URLs require
    // an active/completed enrollment or a course-management permission.
    $viewerId = null;
    $canManageCourses = false;
    if (!empty($_SESSION['user_id'])) {
        $viewer = aec_current_user();
        aec_assert_active_branch($db, $viewer);
        $viewerId = (int)$viewer['id'];
        if ($viewer['role'] === 'super_admin') {
            $canManageCourses = true;
        } else {
            $permission = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'courses.manage' LIMIT 1");
            $permission->execute([$viewer['role']]);
            $canManageCourses = (bool)$permission->fetchColumn();
        }
    }
    if ($course['status'] !== 'published' && !$canManageCourses) aec_fail('Course not found.', 404);
    if (($viewer['role'] ?? '') === 'branch_manager' && (int)$course['branch_id'] !== (int)$viewer['branch_id']) aec_fail('Course not found.', 404);
    if (($viewer['role'] ?? '') === 'student' && $course['branch_id'] !== null && (int)$course['branch_id'] !== (int)$viewer['branch_id']) aec_fail('Course not found.', 404);
    if (!$canManageCourses && $course['branch_id'] !== null) {
        $activeBranch = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
        $activeBranch->execute([(int)$course['branch_id']]);
        if (!$activeBranch->fetchColumn()) aec_fail('Course not found.', 404);
    }

    $hasEnrollment = false;
    if ($viewerId !== null) {
        $enrollment = $db->prepare("SELECT 1 FROM course_enrollments WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') LIMIT 1");
        $enrollment->execute([$viewerId, $id]);
        $hasEnrollment = (bool)$enrollment->fetchColumn();
    }

    $course['can_track_progress'] = $canManageCourses || $hasEnrollment;

    $contentSql = "SELECT ci.id, ci.title, ci.content_type, ci.body, ci.media_url, ci.duration_minutes, cc.sort_order, cc.is_preview
        FROM course_content cc
        JOIN content_items ci ON ci.id = cc.content_item_id
        WHERE cc.course_id = ? AND ci.deleted_at IS NULL AND ci.status = 'published'";
    if (!$canManageCourses && !$hasEnrollment) {
        $contentSql .= ' AND cc.is_preview = 1';
    }
    $contentSql .= ' ORDER BY cc.sort_order, cc.id';
    $items = $db->prepare($contentSql);
    $items->execute([$id]);
    $course['content'] = $items->fetchAll();
    aec_ok($course);
}

if ($action === 'restore') {
    aec_method(['POST']);
    $actor = aec_require_permission('courses.manage');
    aec_assert_active_branch($db, $actor);
    if ($actor['role'] === 'branch_manager' && empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid course id is required.', 422);
    $sql = 'UPDATE courses SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND deleted_at IS NOT NULL';
    $params = [$id];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    if (!$stmt->rowCount()) aec_fail('Deleted course not found.', 404);
    aec_ok(['id' => $id], 'Course restored.');
}

if ($action === 'create' || $action === 'update' || $action === 'delete') {
    aec_method(['POST']);
    $actor = aec_require_permission('courses.manage');
    aec_assert_active_branch($db, $actor);
    if ($actor['role'] === 'branch_manager' && empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
    aec_csrf_check();
    $input = aec_input();

    if ($action === 'delete') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) aec_fail('A valid course id is required.', 422);
        $select = $db->prepare('SELECT id, title, slug, status, branch_id FROM courses WHERE id = ? AND deleted_at IS NULL' . ($actor['role'] === 'branch_manager' ? ' AND branch_id = ?' : '') . ' LIMIT 1');
        $select->execute($actor['role'] === 'branch_manager' ? [$id, (int)$actor['branch_id']] : [$id]);
        $course = $select->fetch();
        if (!$course) aec_fail('Course not found.', 404);
        $db->prepare('UPDATE courses SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL')->execute([$id]);
        aec_recycle_bin_record($db, $actor, 'course', (int)$id, (string)$course['title'], $course['branch_id'] === null ? null : (int)$course['branch_id'], [
            'status' => $course['status'], 'slug' => $course['slug'],
        ]);
        aec_ok(['id' => (int)$id], 'Course moved to recycle bin.');
    }

    $title = trim((string)($input['title'] ?? ''));
    $slug = strtolower(trim((string)($input['slug'] ?? '')));
    $price = filter_var($input['price'] ?? 0, FILTER_VALIDATE_FLOAT);
    if ($title === '' || mb_strlen($title) > 180) aec_fail('Course title is required (maximum 180 characters).', 422);
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) aec_fail('Course slug must contain lowercase letters, numbers and hyphens.', 422);
    if ($price === false || $price < 0) aec_fail('Course price must be zero or greater.', 422);
    $categoryId = isset($input['category_id']) && $input['category_id'] !== '' ? (int)$input['category_id'] : null;
    if ($categoryId !== null) {
        $categoryCheck = $db->prepare('SELECT id, branch_id FROM course_categories WHERE id = ? LIMIT 1');
        $categoryCheck->execute([$categoryId]);
        $category = $categoryCheck->fetch();
        if (!$category) aec_fail('Course category not found.', 404);
        if ($actor['role'] === 'branch_manager' && $category['branch_id'] !== null && (int)$category['branch_id'] !== (int)$actor['branch_id']) {
            aec_fail('Course category is outside your assigned branch.', 403);
        }
    }
    $status = in_array($input['status'] ?? 'draft', ['draft', 'published', 'archived'], true) ? $input['status'] : 'draft';

    if ($action === 'create') {
        $branchId = $actor['role'] === 'branch_manager'
            ? (int)$actor['branch_id']
            : (isset($input['branch_id']) && $input['branch_id'] !== '' ? filter_var($input['branch_id'], FILTER_VALIDATE_INT) : null);
        if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
        if ($branchId !== null) {
            $branchCheck = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
            $branchCheck->execute([$branchId]);
            if (!$branchCheck->fetchColumn()) aec_fail('An active branch is required.', 422);
        }
        if ($categoryId !== null) {
            $categoryBranchCheck = $db->prepare('SELECT branch_id FROM course_categories WHERE id = ?');
            $categoryBranchCheck->execute([$categoryId]);
            $categoryBranchId = $categoryBranchCheck->fetchColumn();
            if ($categoryBranchId === false) aec_fail('Course category not found.', 404);
            if ($categoryBranchId !== null && (int)$categoryBranchId !== (int)($branchId ?? 0)) aec_fail('Course and category must belong to the same branch.', 422);
        }
        $stmt = $db->prepare('INSERT INTO courses (category_id, branch_id, title, slug, subtitle, description, price, original_price, level, duration_weeks, thumbnail, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        try {
            $stmt->execute([$categoryId, $branchId, $title, $slug, trim((string)($input['subtitle'] ?? '')), (string)($input['description'] ?? ''), $price, max(0, (float)($input['original_price'] ?? 0)), (string)($input['level'] ?? 'All Levels'), max(0, (int)($input['duration_weeks'] ?? 0)), (string)($input['thumbnail'] ?? ''), $status, $actor['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') aec_fail('That course slug is already in use.', 409);
            throw $e;
        }
        aec_ok(['id' => (int)$db->lastInsertId()], 'Course created.', 201);
    }

    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) aec_fail('A valid course id is required.', 422);
    $existingCourse = $db->prepare('SELECT branch_id FROM courses WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $existingCourse->execute([$id]);
    $existingBranchId = $existingCourse->fetchColumn();
    if ($existingBranchId === false) aec_fail('Course not found.', 404);
    $branchId = $actor['role'] === 'branch_manager'
        ? (int)$actor['branch_id']
        : (array_key_exists('branch_id', $input)
            ? ($input['branch_id'] === '' || $input['branch_id'] === null ? null : filter_var($input['branch_id'], FILTER_VALIDATE_INT))
            : ($existingBranchId === null ? null : (int)$existingBranchId));
    if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
    if ($branchId !== null) {
        $branchCheck = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
        $branchCheck->execute([$branchId]);
        if (!$branchCheck->fetchColumn()) aec_fail('An active branch is required.', 422);
    }
    if ($categoryId !== null) {
        $categoryBranchCheck = $db->prepare('SELECT branch_id FROM course_categories WHERE id = ?');
        $categoryBranchCheck->execute([$categoryId]);
        $categoryBranchId = $categoryBranchCheck->fetchColumn();
        if ($categoryBranchId === false) aec_fail('Course category not found.', 404);
        if ($categoryBranchId !== null && (int)$categoryBranchId !== (int)($branchId ?? 0)) aec_fail('Course and category must belong to the same branch.', 422);
    }
    $sql = 'UPDATE courses SET category_id=?, branch_id=?, title=?, slug=?, subtitle=?, description=?, price=?, original_price=?, level=?, duration_weeks=?, thumbnail=?, status=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL';
    $params = [$categoryId, $branchId, $title, $slug, trim((string)($input['subtitle'] ?? '')), (string)($input['description'] ?? ''), $price, max(0, (float)($input['original_price'] ?? 0)), (string)($input['level'] ?? 'All Levels'), max(0, (int)($input['duration_weeks'] ?? 0)), (string)($input['thumbnail'] ?? ''), $status, $id];
    if ($actor['role'] === 'branch_manager') { $sql .= ' AND branch_id = ?'; $params[] = (int)$actor['branch_id']; }
    $stmt = $db->prepare($sql);
    try {
        $stmt->execute($params);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('That course slug is already in use.', 409);
        throw $e;
    }
    if (!$stmt->rowCount()) {
        $checkSql = 'SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL';
        $checkParams = [$id];
        if ($actor['role'] === 'branch_manager') { $checkSql .= ' AND branch_id = ?'; $checkParams[] = (int)$actor['branch_id']; }
        $check = $db->prepare($checkSql);
        $check->execute($checkParams);
        if (!$check->fetch()) aec_fail('Course not found.', 404);
    }
    aec_ok(['id' => $id], 'Course updated.');
}

aec_fail('Unknown courses action.', 404);
