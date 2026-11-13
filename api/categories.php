<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? 'list');

function aec_category_parent(PDO $db, mixed $value, ?int $currentId = null, ?int $branchId = null, bool $branchScoped = false): ?int
{
    if ($value === null || $value === '') return null;
    $parentId = filter_var($value, FILTER_VALIDATE_INT);
    if ($parentId === false || $parentId < 1) aec_fail('Invalid parent category identifier.', 422);
    if ($currentId !== null && $parentId === $currentId) aec_fail('A category cannot be its own parent.', 422);

    $check = $db->prepare('SELECT id, branch_id FROM course_categories WHERE id = ? LIMIT 1');
    $check->execute([$parentId]);
    $parent = $check->fetch();
    if (!$parent) aec_fail('Parent category not found.', 404);
    if ($branchScoped && $parent['branch_id'] !== null && (int)$parent['branch_id'] !== $branchId) {
        aec_fail('Parent category is outside your assigned branch.', 403);
    }

    if ($currentId !== null) {
        $cycle = $db->prepare(
            'WITH RECURSIVE descendants AS (
                SELECT id FROM course_categories WHERE parent_id = ?
                UNION ALL
                SELECT child.id FROM course_categories child
                INNER JOIN descendants parent ON child.parent_id = parent.id
            )
            SELECT COUNT(*) FROM descendants WHERE id = ?'
        );
        $cycle->execute([$currentId, $parentId]);
        if ((int)$cycle->fetchColumn() > 0) aec_fail('A category cannot be moved beneath one of its descendants.', 422);
    }

    return (int)$parentId;
}

function aec_category_fields(array $input): array
{
    $name = trim((string)($input['name'] ?? ''));
    $nameBn = trim((string)($input['name_bn'] ?? ''));
    $slug = strtolower(trim((string)($input['slug'] ?? '')));
    $description = trim((string)($input['description'] ?? ''));
    $sortOrder = filter_var($input['sort_order'] ?? 0, FILTER_VALIDATE_INT);

    if ($name === '' || mb_strlen($name) > 120) aec_fail('Category name is required and must not exceed 120 characters.', 422);
    if ($nameBn !== '' && mb_strlen($nameBn) > 120) aec_fail('Bangla category name must not exceed 120 characters.', 422);
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) aec_fail('Category slug must contain lowercase letters, numbers and hyphens.', 422);
    if (mb_strlen($description) > 10000) aec_fail('Category description is too long.', 422);
    if ($sortOrder === false || $sortOrder < 0 || $sortOrder > 2147483647) aec_fail('Invalid category sort order.', 422);

    return [$name, $nameBn ?: null, $slug, $description ?: null, $sortOrder];
}

function aec_category_branch(PDO $db, array $actor, array $input, ?int $existingBranchId = null): ?int
{
    if ($actor['role'] === 'branch_manager') {
        if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
        if ($existingBranchId !== null && $existingBranchId !== (int)$actor['branch_id']) aec_fail('Category not found.', 404);
        return (int)$actor['branch_id'];
    }
    $branchId = array_key_exists('branch_id', $input)
        ? ($input['branch_id'] === null || $input['branch_id'] === '' ? null : filter_var($input['branch_id'], FILTER_VALIDATE_INT))
        : $existingBranchId;
    if ($branchId === false || ($branchId !== null && $branchId < 1)) aec_fail('Invalid branch identifier.', 422);
    if ($branchId !== null) {
        $branch = $db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1');
        $branch->execute([$branchId]);
        if (!$branch->fetchColumn()) aec_fail('An active branch is required.', 422);
    }
    return $branchId;
}

if ($action === 'list') {
    aec_method(['GET']);
    $sql = 'SELECT category.id, category.parent_id, category.branch_id, category.name, category.name_bn, category.slug,
            category.description, category.sort_order, category.created_at,
            (SELECT COUNT(*) FROM courses course WHERE course.category_id = category.id AND course.deleted_at IS NULL) AS course_count
         FROM course_categories category';
    $params = [];
    if (!empty($_SESSION['user_id'])) {
        $actor = aec_current_user();
        aec_assert_active_branch($db, $actor);
        if ($actor['role'] === 'branch_manager') {
            if (empty($actor['branch_id'])) aec_fail('Your account is not assigned to a branch.', 403);
            $sql .= ' WHERE category.branch_id IS NULL OR category.branch_id = ?';
            $params[] = (int)$actor['branch_id'];
        }
    }
    $sql .= ' ORDER BY category.sort_order ASC, category.name ASC, category.id ASC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    aec_ok($stmt->fetchAll());
}

if ($action === 'create') {
    aec_method(['POST']);
    $actor = aec_require_permission('courses.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $input = aec_input();
    [$name, $nameBn, $slug, $description, $sortOrder] = aec_category_fields($input);
    $branchId = aec_category_branch($db, $actor, $input);
    $parentId = aec_category_parent($db, $input['parent_id'] ?? null, null, $branchId, $actor['role'] === 'branch_manager');

    try {
        $stmt = $db->prepare(
            'INSERT INTO course_categories (parent_id, branch_id, name, name_bn, slug, description, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$parentId, $branchId, $name, $nameBn, $slug, $description, $sortOrder]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('That category slug is already in use.', 409);
        throw $e;
    }
    aec_ok(['id' => (int)$db->lastInsertId()], 'Category created.', 201);
}

if ($action === 'update') {
    aec_method(['POST']);
    $actor = aec_require_permission('courses.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid category id is required.', 422);
    $exists = $db->prepare('SELECT id, branch_id FROM course_categories WHERE id = ? LIMIT 1');
    $exists->execute([$id]);
    $current = $exists->fetch();
    if (!$current) aec_fail('Category not found.', 404);
    $existingBranchId = $current['branch_id'] === null ? null : (int)$current['branch_id'];
    if ($actor['role'] === 'branch_manager' && $existingBranchId !== (int)$actor['branch_id']) aec_fail('Category not found.', 404);

    $input = aec_input();
    [$name, $nameBn, $slug, $description, $sortOrder] = aec_category_fields($input);
    $branchId = aec_category_branch($db, $actor, $input, $existingBranchId);
    $parentId = aec_category_parent($db, $input['parent_id'] ?? null, (int)$id, $branchId, $actor['role'] === 'branch_manager');

    try {
        $stmt = $db->prepare(
            'UPDATE course_categories
             SET parent_id = ?, branch_id = ?, name = ?, name_bn = ?, slug = ?, description = ?, sort_order = ?
             WHERE id = ?'
        );
        $stmt->execute([$parentId, $branchId, $name, $nameBn, $slug, $description, $sortOrder, $id]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') aec_fail('That category slug is already in use.', 409);
        throw $e;
    }
    aec_ok(['id' => (int)$id], 'Category updated.');
}

if ($action === 'delete') {
    aec_method(['POST']);
    $actor = aec_require_permission('courses.manage');
    aec_assert_active_branch($db, $actor);
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid category id is required.', 422);

    $exists = $db->prepare('SELECT id, branch_id FROM course_categories WHERE id = ? LIMIT 1');
    $exists->execute([$id]);
    $category = $exists->fetch();
    if (!$category) aec_fail('Category not found.', 404);
    if ($actor['role'] === 'branch_manager' && (int)$category['branch_id'] !== (int)$actor['branch_id']) aec_fail('Category not found.', 404);

    $usage = $db->prepare(
        'SELECT
            (SELECT COUNT(*) FROM courses WHERE category_id = ? AND deleted_at IS NULL) AS courses,
            (SELECT COUNT(*) FROM course_categories WHERE parent_id = ?) AS children'
    );
    $usage->execute([$id, $id]);
    $counts = $usage->fetch();
    if ((int)$counts['courses'] > 0 || (int)$counts['children'] > 0) {
        aec_fail('Move or remove linked courses and child categories before deleting this category.', 409);
    }

    $db->prepare('DELETE FROM course_categories WHERE id = ?')->execute([$id]);
    aec_ok(null, 'Category deleted.');
}

aec_fail('Unknown category action.', 404);
