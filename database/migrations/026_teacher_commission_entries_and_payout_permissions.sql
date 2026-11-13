-- Snapshot commission terms at the moment a course payment is verified.
-- Historical earnings remain unchanged when a teacher assignment or rate changes.
CREATE TABLE IF NOT EXISTS teacher_commission_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  teacher_user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  commission_percentage_snapshot DECIMAL(5,2) NOT NULL,
  payment_amount_snapshot DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_teacher_commission_payment_teacher (payment_id, teacher_user_id),
  INDEX idx_teacher_commission_teacher_course (teacher_user_id, course_id, created_at),
  INDEX idx_teacher_commission_branch (branch_id, created_at),
  CONSTRAINT fk_teacher_commission_payment FOREIGN KEY (payment_id) REFERENCES course_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_commission_assignment FOREIGN KEY (assignment_id) REFERENCES teacher_course_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_commission_teacher FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_commission_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_teacher_commission_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT chk_teacher_commission_snapshot_rate CHECK (commission_percentage_snapshot >= 0 AND commission_percentage_snapshot <= 100),
  CONSTRAINT chk_teacher_commission_snapshot_amount CHECK (payment_amount_snapshot > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accountants may review/settle payouts, but only administrators may change
-- course assignments or commission rates.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'teacher_commissions.payouts.manage', 1),
('super_admin', 'teacher_commissions.payouts.manage', 1),
('accountant', 'teacher_commissions.payouts.manage', 1),
('branch_manager', 'teacher_commissions.payouts.manage', 0),
('teacher', 'teacher_commissions.payouts.manage', 0),
('assistant_teacher', 'teacher_commissions.payouts.manage', 0),
('student', 'teacher_commissions.payouts.manage', 0),
('guardian', 'teacher_commissions.payouts.manage', 0),
('support_staff', 'teacher_commissions.payouts.manage', 0);
