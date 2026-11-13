-- Persistent per-course daily attendance records.
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL,
  remarks VARCHAR(1000) NULL,
  marked_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_attendance_course_user_date (course_id, user_id, attendance_date),
  INDEX idx_attendance_course_date_status (course_id, attendance_date, status),
  INDEX idx_attendance_user_date (user_id, attendance_date),
  CONSTRAINT fk_attendance_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_marker FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'attendance.manage', 1),
('branch_manager', 'attendance.manage', 0),
('teacher', 'attendance.manage', 0),
('assistant_teacher', 'attendance.manage', 0),
('accountant', 'attendance.manage', 0),
('student', 'attendance.manage', 0),
('guardian', 'attendance.manage', 0),
('support_staff', 'attendance.manage', 0);
