-- Preserve sub-second boundaries so a payment cannot accrue under two
-- consecutive assignment periods created within the same second.
ALTER TABLE teacher_course_assignments
  MODIFY assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  MODIFY unassigned_at DATETIME(6) NULL;

ALTER TABLE course_payments
  MODIFY reviewed_at DATETIME(6) NULL;

-- Accountants can review and settle payouts but cannot change assignments/rates.
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
