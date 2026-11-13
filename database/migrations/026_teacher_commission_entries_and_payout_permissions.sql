-- Separate payout approval permission from assignment/rate management.
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
