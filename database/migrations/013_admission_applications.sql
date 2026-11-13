-- Persist public admission inquiries without creating accounts or falsely marking payments as verified.
CREATE TABLE IF NOT EXISTS admission_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reference_code VARCHAR(40) NOT NULL,
  applicant_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  branch_label VARCHAR(120) NULL,
  preferred_contact ENUM('phone','email') NOT NULL DEFAULT 'phone',
  message VARCHAR(2000) NULL,
  status ENUM('pending','contacted','rejected') NOT NULL DEFAULT 'pending',
  ip_address VARCHAR(45) NOT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_notes VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_admission_reference_code (reference_code),
  INDEX idx_admission_status_created (status, created_at),
  INDEX idx_admission_ip_created (ip_address, created_at),
  INDEX idx_admission_email_created (email, created_at),
  CONSTRAINT fk_admission_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_admission_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'admissions.manage', 1),
('branch_manager', 'admissions.manage', 0),
('teacher', 'admissions.manage', 0),
('assistant_teacher', 'admissions.manage', 0),
('accountant', 'admissions.manage', 0),
('student', 'admissions.manage', 0),
('guardian', 'admissions.manage', 0),
('support_staff', 'admissions.manage', 0);
