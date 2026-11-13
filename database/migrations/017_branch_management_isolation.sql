-- Branch registry and tenant-safe data ownership.
-- Existing branch IDs are preserved and represented as imported branches.
CREATE TABLE IF NOT EXISTS branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  city VARCHAR(120) NULL,
  address VARCHAR(500) NULL,
  phone VARCHAR(32) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_branches_code (code),
  INDEX idx_branches_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE users SET branch_id = NULL WHERE branch_id = 0;
UPDATE course_enrollments SET branch_id = NULL WHERE branch_id = 0;
UPDATE live_classes SET branch_id = NULL WHERE branch_id = 0;

INSERT IGNORE INTO branches (id, code, name, is_active)
SELECT branch_id, CONCAT('BR-', branch_id), CONCAT('Imported Branch ', branch_id), 1
FROM (
  SELECT branch_id FROM users WHERE branch_id IS NOT NULL AND branch_id > 0
  UNION
  SELECT branch_id FROM course_enrollments WHERE branch_id IS NOT NULL AND branch_id > 0
  UNION
  SELECT branch_id FROM live_classes WHERE branch_id IS NOT NULL AND branch_id > 0
) existing_branch_ids;

SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'users' AND constraint_name = 'fk_users_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'courses' AND column_name = 'branch_id';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE courses ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER category_id', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'courses' AND index_name = 'idx_courses_branch_status';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE courses ADD INDEX idx_courses_branch_status (branch_id, status, deleted_at)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'courses' AND constraint_name = 'fk_courses_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE courses ADD CONSTRAINT fk_courses_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'course_enrollments' AND constraint_name = 'fk_enrollments_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_enrollments ADD CONSTRAINT fk_enrollments_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'course_payments' AND column_name = 'branch_id';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_payments ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER course_id', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_payments' AND index_name = 'idx_course_payments_branch_status';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_payments ADD INDEX idx_course_payments_branch_status (branch_id, status, submitted_at)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'course_payments' AND constraint_name = 'fk_course_payments_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_payments ADD CONSTRAINT fk_course_payments_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'attendance_records' AND column_name = 'branch_id';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE attendance_records ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER course_id', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'attendance_records' AND index_name = 'idx_attendance_branch_date';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE attendance_records ADD INDEX idx_attendance_branch_date (branch_id, attendance_date)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'attendance_records' AND constraint_name = 'fk_attendance_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE attendance_records ADD CONSTRAINT fk_attendance_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'branch_id';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE certificates ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER course_id', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'idx_certificates_branch_status';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE certificates ADD INDEX idx_certificates_branch_status (branch_id, status, issued_at)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'certificates' AND constraint_name = 'fk_certificates_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE certificates ADD CONSTRAINT fk_certificates_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'live_classes' AND index_name = 'idx_live_classes_branch_schedule';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE live_classes ADD INDEX idx_live_classes_branch_schedule (branch_id, starts_at, status)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'live_classes' AND constraint_name = 'fk_live_classes_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE live_classes ADD CONSTRAINT fk_live_classes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;
-- A course is branch-owned only when its existing enrollments all belong to one branch.
-- Courses with mixed or absent branch enrollment remain unassigned and are hidden from branch managers.
UPDATE courses c
JOIN (
  SELECT course_id, MIN(branch_id) AS branch_id
  FROM course_enrollments
  WHERE branch_id IS NOT NULL
  GROUP BY course_id
  HAVING COUNT(DISTINCT branch_id) = 1
) e ON e.course_id = c.id
SET c.branch_id = e.branch_id
WHERE c.branch_id IS NULL;

UPDATE course_enrollments e
JOIN users u ON u.id = e.user_id
SET e.branch_id = u.branch_id
WHERE e.branch_id IS NULL AND u.branch_id IS NOT NULL;

SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'course_categories' AND column_name = 'branch_id';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_categories ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER parent_id', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;

SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_categories' AND index_name = 'idx_categories_branch_name';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_categories ADD INDEX idx_categories_branch_name (branch_id, name)', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;

SELECT COUNT(*) INTO @aec_branch_exists FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'course_categories' AND constraint_name = 'fk_categories_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_branch_sql = IF(@aec_branch_exists = 0, 'ALTER TABLE course_categories ADD CONSTRAINT fk_categories_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_branch_noop = 1');
PREPARE aec_branch_stmt FROM @aec_branch_sql;
EXECUTE aec_branch_stmt;
DEALLOCATE PREPARE aec_branch_stmt;

-- A category becomes branch-owned only when every linked course belongs to the same branch.
UPDATE course_categories cat
JOIN (
  SELECT category_id, MIN(branch_id) AS branch_id
  FROM courses
  WHERE category_id IS NOT NULL
  GROUP BY category_id
  HAVING COUNT(DISTINCT branch_id) = 1 AND SUM(branch_id IS NULL) = 0
) owned_categories ON owned_categories.category_id = cat.id
SET cat.branch_id = owned_categories.branch_id
WHERE cat.branch_id IS NULL;

UPDATE course_payments p
JOIN users u ON u.id = p.user_id
LEFT JOIN course_enrollments e ON e.user_id = p.user_id AND e.course_id = p.course_id
LEFT JOIN courses c ON c.id = p.course_id
SET p.branch_id = COALESCE(u.branch_id, e.branch_id, c.branch_id)
WHERE p.branch_id IS NULL;

UPDATE attendance_records ar
JOIN course_enrollments e ON e.course_id = ar.course_id AND e.user_id = ar.user_id
SET ar.branch_id = e.branch_id
WHERE ar.branch_id IS NULL;

UPDATE certificates cert
JOIN course_enrollments e ON e.course_id = cert.course_id AND e.user_id = cert.student_user_id
SET cert.branch_id = e.branch_id
WHERE cert.branch_id IS NULL;

UPDATE live_classes l
JOIN courses c ON c.id = l.course_id
SET l.branch_id = c.branch_id
WHERE l.branch_id IS NULL AND c.branch_id IS NOT NULL;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'branches.manage', 1),
('branch_manager', 'branches.manage', 0),
('teacher', 'branches.manage', 0),
('assistant_teacher', 'branches.manage', 0),
('accountant', 'branches.manage', 0),
('student', 'branches.manage', 0),
('guardian', 'branches.manage', 0),
('support_staff', 'branches.manage', 0),
('branch_manager', 'users.manage', 1),
('branch_manager', 'courses.manage', 1),
('branch_manager', 'enrollments.manage', 1),
('branch_manager', 'payments.manage', 1),
('branch_manager', 'attendance.manage', 1),
('branch_manager', 'certificates.manage', 1),
('branch_manager', 'live_classes.manage', 1);

UPDATE role_permissions
SET allowed = 1
WHERE role = 'branch_manager'
  AND permission_key IN (
    'users.manage', 'courses.manage', 'enrollments.manage', 'payments.manage',
    'attendance.manage', 'certificates.manage', 'live_classes.manage'
  );

UPDATE role_permissions
SET allowed = 0
WHERE role = 'branch_manager'
  AND permission_key IN ('branches.manage', 'content.manage');

-- Content items are still shared/global, so branch managers do not receive content.manage.
