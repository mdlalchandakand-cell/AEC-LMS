-- Course enrolments are independent of payments. Only an authorized administrator can activate access.
CREATE TABLE IF NOT EXISTS course_enrollments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  status ENUM('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
  enrolled_by BIGINT UNSIGNED NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_enrollment_user_course (user_id, course_id),
  INDEX idx_enrollment_course_status (course_id, status),
  INDEX idx_enrollment_user_status (user_id, status),
  INDEX idx_enrollment_branch (branch_id),
  CONSTRAINT fk_enrollment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollment_creator FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'enrollments.manage', 1),
('branch_manager', 'enrollments.manage', 0),
('teacher', 'enrollments.manage', 0),
('assistant_teacher', 'enrollments.manage', 0),
('accountant', 'enrollments.manage', 0),
('student', 'enrollments.manage', 0),
('guardian', 'enrollments.manage', 0),
('support_staff', 'enrollments.manage', 0);
