-- Manual, provider-confirmed refunds and balanced reversal journals.
-- A refund is recorded only after an operator has completed it with the external payment provider.
CREATE TABLE IF NOT EXISTS payment_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  refund_reference VARCHAR(120) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('completed') NOT NULL DEFAULT 'completed',
  processed_by BIGINT UNSIGNED NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_refund_reference (refund_reference),
  UNIQUE KEY uq_payment_refund_payment_reference (payment_id, refund_reference),
  INDEX idx_payment_refund_payment_status (payment_id, status, processed_at),
  CONSTRAINT fk_payment_refund_payment FOREIGN KEY (payment_id) REFERENCES course_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_refund_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_payment_refund_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE course_payments
  MODIFY COLUMN status ENUM('pending','verified','rejected','refunded') NOT NULL DEFAULT 'pending';

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'ledger_transactions' AND column_name = 'payment_id' AND is_nullable = 'NO';
SET @aec_refund_sql = IF(@aec_refund_exists > 0, 'ALTER TABLE ledger_transactions MODIFY COLUMN payment_id BIGINT UNSIGNED NULL', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'ledger_transactions' AND column_name = 'refund_id';
SET @aec_refund_sql = IF(@aec_refund_exists = 0, 'ALTER TABLE ledger_transactions ADD COLUMN refund_id BIGINT UNSIGNED NULL AFTER payment_id', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'ledger_transactions' AND index_name = 'uq_ledger_refund_id';
SET @aec_refund_sql = IF(@aec_refund_exists = 0, 'ALTER TABLE ledger_transactions ADD UNIQUE INDEX uq_ledger_refund_id (refund_id)', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.table_constraints
WHERE table_schema = DATABASE() AND table_name = 'ledger_transactions' AND constraint_name = 'fk_ledger_refund' AND constraint_type = 'FOREIGN KEY';
SET @aec_refund_sql = IF(@aec_refund_exists = 0, 'ALTER TABLE ledger_transactions ADD CONSTRAINT fk_ledger_refund FOREIGN KEY (refund_id) REFERENCES payment_refunds(id) ON DELETE RESTRICT', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.table_constraints
WHERE table_schema = DATABASE() AND table_name = 'ledger_transactions' AND constraint_name = 'chk_ledger_transaction_source' AND constraint_type = 'CHECK';
SET @aec_refund_sql = IF(@aec_refund_exists = 0, 'ALTER TABLE ledger_transactions ADD CONSTRAINT chk_ledger_transaction_source CHECK ((payment_id IS NULL) <> (refund_id IS NULL))', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

SELECT COUNT(*) INTO @aec_refund_exists
FROM information_schema.table_constraints
WHERE table_schema = DATABASE() AND table_name = 'ledger_entries' AND constraint_name = 'chk_ledger_entry_debit_credit' AND constraint_type = 'CHECK';
SET @aec_refund_sql = IF(@aec_refund_exists = 0, 'ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entry_debit_credit CHECK (debit >= 0 AND credit >= 0 AND ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)))', 'SET @aec_refund_noop = 1');
PREPARE aec_refund_stmt FROM @aec_refund_sql;
EXECUTE aec_refund_stmt;
DEALLOCATE PREPARE aec_refund_stmt;

