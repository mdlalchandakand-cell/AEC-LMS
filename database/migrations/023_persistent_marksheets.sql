-- Persistent, server-issued marksheets derived only from submitted exam attempts.
CREATE TABLE IF NOT EXISTS marksheets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  marksheet_number VARCHAR(80) NOT NULL,
  exam_attempt_id BIGINT UNSIGNED NOT NULL,
  exam_id BIGINT UNSIGNED NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NULL,
  student_name_snapshot VARCHAR(160) NOT NULL,
  student_email_snapshot VARCHAR(190) NOT NULL,
  exam_title_snapshot VARCHAR(180) NOT NULL,
  course_title_snapshot VARCHAR(180) NULL,
  score DECIMAL(8,2) NOT NULL,
  total_marks DECIMAL(8,2) NOT NULL,
  percentage DECIMAL(6,2) NOT NULL,
  passed TINYINT(1) NOT NULL,
  grade VARCHAR(8) NOT NULL,
  issued_by BIGINT UNSIGNED NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marksheet_number (marksheet_number),
  UNIQUE KEY uq_marksheet_attempt (exam_attempt_id),
  INDEX idx_marksheet_student_issued (student_user_id, issued_at),
  INDEX idx_marksheet_exam (exam_id),
  CONSTRAINT fk_marksheet_attempt FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_marksheet_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_marksheet_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_marksheet_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_marksheet_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_marksheet_total_positive CHECK (total_marks > 0),
  CONSTRAINT chk_marksheet_score_nonnegative CHECK (score >= 0),
  CONSTRAINT chk_marksheet_percentage_range CHECK (percentage >= 0 AND percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
  ('admin', 'marksheets.manage', 1),
  ('branch_manager', 'marksheets.manage', 0),
  ('teacher', 'marksheets.manage', 0),
  ('accountant', 'marksheets.manage', 0),
  ('student', 'marksheets.manage', 0);
