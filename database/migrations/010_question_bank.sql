-- Reusable multiple-choice question bank and source links for exam copies.
CREATE TABLE IF NOT EXISTS question_bank_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  question_text TEXT NOT NULL,
  options JSON NOT NULL,
  correct_option_index TINYINT UNSIGNED NOT NULL,
  explanation TEXT NULL,
  marks DECIMAL(8,2) NOT NULL DEFAULT 1,
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'intermediate',
  tags JSON NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_question_bank_category_status (category, status),
  INDEX idx_question_bank_difficulty (difficulty),
  CONSTRAINT fk_question_bank_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_question_bank_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  exam_question_id BIGINT UNSIGNED NOT NULL,
  question_bank_item_id BIGINT UNSIGNED NOT NULL,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_question_bank_exam_item (exam_id, question_bank_item_id),
  UNIQUE KEY uq_exam_question_bank_exam_question (exam_question_id),
  CONSTRAINT fk_exam_question_bank_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_question_bank_exam_question FOREIGN KEY (exam_question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_question_bank_item FOREIGN KEY (question_bank_item_id) REFERENCES question_bank_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
  ('admin', 'question_bank.manage', 1),
  ('branch_manager', 'question_bank.manage', 0),
  ('teacher', 'question_bank.manage', 0),
  ('student', 'question_bank.manage', 0);
