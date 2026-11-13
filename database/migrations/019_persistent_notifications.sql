-- Persistent, per-user in-app notifications and administrator broadcasts.
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  sender_user_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  title_bn VARCHAR(180) NULL,
  message TEXT NOT NULL,
  message_bn TEXT NULL,
  type ENUM('info','success','warning','alert') NOT NULL DEFAULT 'info',
  target_role VARCHAR(40) NOT NULL DEFAULT 'all',
  action_url VARCHAR(80) NULL,
  read_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_recipient_read_created (recipient_user_id, read_at, created_at),
  INDEX idx_notifications_recipient_deleted (recipient_user_id, deleted_at),
  INDEX idx_notifications_sender_created (sender_user_id, created_at),
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'notifications.broadcast', 1),
('branch_manager', 'notifications.broadcast', 0),
('teacher', 'notifications.broadcast', 0),
('assistant_teacher', 'notifications.broadcast', 0),
('accountant', 'notifications.broadcast', 0),
('student', 'notifications.broadcast', 0),
('guardian', 'notifications.broadcast', 0),
('support_staff', 'notifications.broadcast', 0);
