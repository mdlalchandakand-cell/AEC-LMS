-- Minimal default permissions. INSERT IGNORE preserves administrator customizations on reruns.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'courses.manage', 1),
('branch_manager', 'courses.manage', 1),
('teacher', 'courses.manage', 0),
('assistant_teacher', 'courses.manage', 0),
('accountant', 'courses.manage', 0),
('student', 'courses.manage', 0),
('guardian', 'courses.manage', 0),
('support_staff', 'courses.manage', 0);
