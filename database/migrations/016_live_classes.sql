-- Persistent live-class schedule. Meeting credentials/URLs remain server-side in the database.
CREATE TABLE IF NOT EXISTS live_classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  instructor_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  starts_at DATETIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  meeting_platform ENUM('google_meet','zoom','teams') NOT NULL,
  meeting_url VARCHAR(2048) NOT NULL,
  recording_url VARCHAR(2048) NULL,
  status ENUM('upcoming','live','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_live_classes_schedule (starts_at, status),
  INDEX idx_live_classes_course_schedule (course_id, starts_at),
  INDEX idx_live_classes_instructor_schedule (instructor_id, starts_at),
  CONSTRAINT fk_live_class_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_live_class_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_live_class_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branch managers remain blocked until branch-scoped data isolation is implemented.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'live_classes.manage', 1),
('branch_manager', 'live_classes.manage', 0),
('teacher', 'live_classes.manage', 1),
('assistant_teacher', 'live_classes.manage', 0),
('accountant', 'live_classes.manage', 0),
('student', 'live_classes.manage', 0),
('guardian', 'live_classes.manage', 0),
('support_staff', 'live_classes.manage', 0);
