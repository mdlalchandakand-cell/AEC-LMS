-- Least-privilege content-management defaults; preserve manual changes on reruns.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'content.manage', 1),
('branch_manager', 'content.manage', 1),
('teacher', 'content.manage', 0),
('assistant_teacher', 'content.manage', 0),
('accountant', 'content.manage', 0),
('student', 'content.manage', 0),
('guardian', 'content.manage', 0),
('support_staff', 'content.manage', 0);
