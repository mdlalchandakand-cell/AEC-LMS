-- Manual payment review and double-entry ledger. Ledger entries are append-only through the application API.
CREATE TABLE IF NOT EXISTS course_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  payment_method ENUM('bKash','Nagad','Bank Transfer') NOT NULL,
  trx_id VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(32) NULL,
  status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  rejection_reason VARCHAR(500) NULL,
  INDEX idx_course_payment_user_status (user_id, status),
  INDEX idx_course_payment_course_status (course_id, status),
  UNIQUE KEY uq_course_payment_method_trx (payment_method, trx_id),
  CONSTRAINT fk_course_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_course_payment_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_course_payment_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(40) NOT NULL UNIQUE,
  account_name VARCHAR(120) NOT NULL,
  account_type ENUM('asset','liability','equity','income','expense') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL UNIQUE,
  reference VARCHAR(140) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ledger_payment FOREIGN KEY (payment_id) REFERENCES course_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ledger_entry_transaction (transaction_id),
  INDEX idx_ledger_entry_account (account_id, created_at),
  CONSTRAINT fk_ledger_entry_transaction FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entry_account FOREIGN KEY (account_id) REFERENCES accounting_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO accounting_accounts (account_code, account_name, account_type) VALUES
('ASSET_BKASH_NAGAD_CLEARING', 'bKash / Nagad Clearing', 'asset'),
('ASSET_BANK_CLEARING', 'Bank Transfer Clearing', 'asset'),
('INCOME_TUITION', 'Tuition Revenue', 'income');

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'payments.manage', 1),
('branch_manager', 'payments.manage', 0),
('teacher', 'payments.manage', 0),
('assistant_teacher', 'payments.manage', 0),
('accountant', 'payments.manage', 0),
('student', 'payments.manage', 0),
('guardian', 'payments.manage', 0),
('support_staff', 'payments.manage', 0);
