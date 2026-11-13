-- Invalidate every existing session after a password reset or administrative password change.
-- Use a prepared conditional ALTER because MySQL 8.4 does not support
-- ADD COLUMN IF NOT EXISTS (MariaDB does); this remains safe on migration reruns.
SET @aec_session_version_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'session_version'
);
SET @aec_session_version_ddl = IF(
  @aec_session_version_exists = 0,
  'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER password_hash',
  'DO 1'
);
PREPARE aec_session_version_stmt FROM @aec_session_version_ddl;
EXECUTE aec_session_version_stmt;
DEALLOCATE PREPARE aec_session_version_stmt;

-- Single-use, hashed tokens for public student email verification and password recovery.
CREATE TABLE IF NOT EXISTS account_action_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('verify_email','password_reset') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  requested_ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_action_token_hash (token_hash),
  INDEX idx_account_action_user_purpose (user_id, purpose, created_at),
  INDEX idx_account_action_expiry (expires_at),
  CONSTRAINT fk_account_action_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_action_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(32) NOT NULL,
  email VARCHAR(190) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_action_rate (action, email, ip_address, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
