-- User management permission; INSERT IGNORE preserves existing administrator choices.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'users.manage', 1),
('branch_manager', 'users.manage', 0),
('teacher', 'users.manage', 0),
('assistant_teacher', 'users.manage', 0),
('accountant', 'users.manage', 0),
('student', 'users.manage', 0),
('guardian', 'users.manage', 0),
('support_staff', 'users.manage', 0);
