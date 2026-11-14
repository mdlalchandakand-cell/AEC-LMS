-- Explicit course seats selected under an active subscription plan.
CREATE TABLE IF NOT EXISTS user_subscription_courses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subscription_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  status ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
  selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_subscription_course (subscription_id, course_id),
  INDEX idx_subscription_courses_user_status (user_id, status, course_id),
  INDEX idx_subscription_courses_course_status (course_id, status),
  CONSTRAINT fk_subscription_course_subscription FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_course_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_course_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_course_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
