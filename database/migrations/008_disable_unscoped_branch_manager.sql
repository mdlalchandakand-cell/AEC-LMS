-- Branch managers must not receive global course/content permissions until branch-scoped
-- authorization and data isolation are implemented across all affected resources.
UPDATE role_permissions
SET allowed = 0
WHERE role = 'branch_manager'
  AND permission_key IN ('courses.manage', 'content.manage');
