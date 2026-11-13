-- Verified guardian-to-student links. No guardian can view student records until
-- the student explicitly accepts the request.
CREATE TABLE IF NOT EXISTS guardian_student_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  guardian_user_id BIGINT UNSIGNED NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  relationship VARCHAR(60) NOT NULL DEFAULT 'Guardian',
  status ENUM('pending','active','rejected','revoked') NOT NULL DEFAULT 'pending',
  requested_by BIGINT UNSIGNED NOT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_guardian_student_link (guardian_user_id, student_user_id),
  INDEX idx_guardian_links_guardian_status (guardian_user_id, status, requested_at),
  INDEX idx_guardian_links_student_status (student_user_id, status, requested_at),
  CONSTRAINT fk_guardian_link_guardian FOREIGN KEY (guardian_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_guardian_link_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_guardian_link_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_guardian_link_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_guardian_not_self CHECK (guardian_user_id <> student_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'guardians.manage', 1),
('branch_manager', 'guardians.manage', 1),
('teacher', 'guardians.manage', 0),
('assistant_teacher', 'guardians.manage', 0),
('accountant', 'guardians.manage', 0),
('student', 'guardians.manage', 0),
('guardian', 'guardians.manage', 0),
('support_staff', 'guardians.manage', 0);
