-- Persistent, branch-scoped operational expenses with approval and payment audit.
CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  name_bn VARCHAR(120) NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO expense_categories (name, name_bn, code, sort_order) VALUES
('Instructor Remuneration', 'শিক্ষক সম্মানী', 'INSTRUCTOR_REMUNERATION', 10),
('Branch Rent', 'শাখা ভাড়া', 'BRANCH_RENT', 20),
('Electricity & Utility', 'বিদ্যুৎ ও ইউটিলিটি', 'ELECTRICITY_UTILITY', 30),
('Marketing & Ads', 'মার্কেটিং ও বিজ্ঞাপন', 'MARKETING_ADS', 40),
('Software & Hosting', 'সফটওয়্যার ও হোস্টিং', 'SOFTWARE_HOSTING', 50),
('Stationery', 'স্টেশনারি', 'STATIONERY', 60),
('Other', 'অন্যান্য', 'OTHER', 90);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  expense_date DATE NOT NULL,
  vendor VARCHAR(160) NULL,
  payment_method ENUM('Cash','Bank Transfer','bKash','Nagad','Card','Other') NOT NULL DEFAULT 'Cash',
  reference VARCHAR(120) NULL,
  paid_reference VARCHAR(120) NULL,
  status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  paid_by BIGINT UNSIGNED NULL,
  paid_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_expenses_branch_date_status (branch_id, expense_date, status),
  INDEX idx_expenses_category_date (category_id, expense_date),
  INDEX idx_expenses_creator (created_by, created_at),
  UNIQUE KEY uq_expenses_paid_reference (paid_reference),
  CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_payer FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_expenses_positive_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
