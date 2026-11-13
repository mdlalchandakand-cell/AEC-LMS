-- Persistent, auditable course completion certificates.
CREATE TABLE IF NOT EXISTS certificates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  certificate_number VARCHAR(60) NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  student_id_snapshot VARCHAR(40) NOT NULL,
  student_name_snapshot VARCHAR(160) NOT NULL,
  course_title_snapshot VARCHAR(180) NOT NULL,
  completion_date DATE NOT NULL,
  grade VARCHAR(100) NOT NULL DEFAULT 'Completed',
  authorized_by VARCHAR(160) NOT NULL,
  status ENUM('issued','revoked') NOT NULL DEFAULT 'issued',
  issued_by BIGINT UNSIGNED NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by BIGINT UNSIGNED NULL,
  revoked_at DATETIME NULL,
  revoke_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_certificates_number (certificate_number),
  UNIQUE KEY uq_certificates_student_course (student_user_id, course_id),
  INDEX idx_certificates_student_status (student_user_id, status, issued_at),
  INDEX idx_certificates_course_status (course_id, status, issued_at),
  CONSTRAINT fk_certificates_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_revoker FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'certificates.manage', 1),
('branch_manager', 'certificates.manage', 0),
('teacher', 'certificates.manage', 0),
('assistant_teacher', 'certificates.manage', 0),
('accountant', 'certificates.manage', 0),
('student', 'certificates.manage', 0),
('guardian', 'certificates.manage', 0),
('support_staff', 'certificates.manage', 0);
