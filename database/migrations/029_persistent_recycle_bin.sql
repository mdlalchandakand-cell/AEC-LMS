-- Persistent recycle bin with one active record per entity and 30-day retention.
CREATE TABLE IF NOT EXISTS recycle_bin_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('course','content','batch','exam','cms_post','cms_testimonial') NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(220) NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  deleted_by BIGINT UNSIGNED NULL,
  snapshot JSON NOT NULL,
  status ENUM('active','restored','purged') NOT NULL DEFAULT 'active',
  active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED,
  deleted_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  restored_by BIGINT UNSIGNED NULL,
  restored_at DATETIME NULL,
  purged_by BIGINT UNSIGNED NULL,
  purged_at DATETIME NULL,
  purge_error VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recycle_active_entity (entity_type, entity_id, active_slot),
  INDEX idx_recycle_status_expiry (status, expires_at),
  INDEX idx_recycle_branch (branch_id, status, deleted_at),
  CONSTRAINT fk_recycle_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_recycle_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_recycle_restored_by FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_recycle_purged_by FOREIGN KEY (purged_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, branch_id, snapshot, status, deleted_at, expires_at)
SELECT 'course', c.id, c.title, c.branch_id, JSON_OBJECT('status', c.status, 'slug', c.slug), 'active',
       c.deleted_at, DATE_ADD(c.deleted_at, INTERVAL 30 DAY)
FROM courses c
WHERE c.deleted_at IS NOT NULL;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, snapshot, status, deleted_at, expires_at)
SELECT 'content', c.id, c.title, JSON_OBJECT('status', c.status, 'content_type', c.content_type), 'active',
       c.deleted_at, DATE_ADD(c.deleted_at, INTERVAL 30 DAY)
FROM content_items c
WHERE c.deleted_at IS NOT NULL;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, branch_id, snapshot, status, deleted_at, expires_at)
SELECT 'batch', b.id, b.name, b.branch_id, JSON_OBJECT('status', b.status, 'batch_code', b.batch_code), 'active',
       b.deleted_at, DATE_ADD(b.deleted_at, INTERVAL 30 DAY)
FROM batches b
WHERE b.deleted_at IS NOT NULL;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, branch_id, snapshot, status, deleted_at, expires_at)
SELECT 'exam', e.id, e.title, c.branch_id, JSON_OBJECT('status', e.status, 'course_id', e.course_id), 'active',
       e.deleted_at, DATE_ADD(e.deleted_at, INTERVAL 30 DAY)
FROM exams e
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.deleted_at IS NOT NULL;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, snapshot, status, deleted_at, expires_at)
SELECT 'cms_post', p.id, p.title, JSON_OBJECT('status', p.status, 'slug', p.slug, 'category', p.category), 'active',
       p.deleted_at, DATE_ADD(p.deleted_at, INTERVAL 30 DAY)
FROM cms_posts p
WHERE p.deleted_at IS NOT NULL;

INSERT IGNORE INTO recycle_bin_items (entity_type, entity_id, title, snapshot, status, deleted_at, expires_at)
SELECT 'cms_testimonial', t.id, t.student_name, JSON_OBJECT('status', t.status, 'achievement', t.achievement), 'active',
       t.deleted_at, DATE_ADD(t.deleted_at, INTERVAL 30 DAY)
FROM cms_testimonials t
WHERE t.deleted_at IS NOT NULL;

-- Branch managers may view/restore only their own branch's items.
-- Only administrators may permanently purge expired items.
INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'recycle_bin.manage', 1),
('super_admin', 'recycle_bin.manage', 1),
('branch_manager', 'recycle_bin.manage', 1),
('teacher', 'recycle_bin.manage', 0),
('assistant_teacher', 'recycle_bin.manage', 0),
('accountant', 'recycle_bin.manage', 0),
('student', 'recycle_bin.manage', 0),
('guardian', 'recycle_bin.manage', 0),
('support_staff', 'recycle_bin.manage', 0),
('admin', 'recycle_bin.purge', 1),
('super_admin', 'recycle_bin.purge', 1),
('branch_manager', 'recycle_bin.purge', 0),
('teacher', 'recycle_bin.purge', 0),
('assistant_teacher', 'recycle_bin.purge', 0),
('accountant', 'recycle_bin.purge', 0),
('student', 'recycle_bin.purge', 0),
('guardian', 'recycle_bin.purge', 0),
('support_staff', 'recycle_bin.purge', 0);
