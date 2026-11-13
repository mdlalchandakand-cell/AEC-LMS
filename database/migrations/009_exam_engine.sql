-- Server-side timed multiple-choice examination engine.
CREATE TABLE IF NOT EXISTS exams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  total_marks DECIMAL(8,2) NOT NULL DEFAULT 0,
  pass_marks DECIMAL(8,2) NOT NULL DEFAULT 0,
  negative_mark_per_wrong DECIMAL(6,2) NOT NULL DEFAULT 0,
  max_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_exams_course_status (course_id, status),
  INDEX idx_exams_created_by (created_by),
  CONSTRAINT fk_exams_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_exams_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_option_index TINYINT UNSIGNED NOT NULL,
  explanation TEXT NULL,
  marks DECIMAL(8,2) NOT NULL DEFAULT 1,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_question_order (exam_id, sort_order),
  INDEX idx_exam_questions_exam (exam_id),
  CONSTRAINT fk_exam_questions_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score DECIMAL(8,2) NULL,
  total_marks DECIMAL(8,2) NULL,
  percentage DECIMAL(6,2) NULL,
  passed TINYINT(1) NULL,
  status ENUM('in_progress', 'submitted', 'expired') NOT NULL DEFAULT 'in_progress',
  answers_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exam_attempts_user_exam (user_id, exam_id, status),
  INDEX idx_exam_attempts_exam_status (exam_id, status),
  CONSTRAINT fk_exam_attempts_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_exam_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
  ('admin', 'exams.manage', 1),
  ('branch_manager', 'exams.manage', 0),
  ('teacher', 'exams.manage', 0),
  ('student', 'exams.manage', 0);
