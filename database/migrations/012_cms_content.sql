-- Persistent public website settings, blog posts and student testimonials.
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_site_setting_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  title_bn VARCHAR(180) NULL,
  slug VARCHAR(200) NOT NULL,
  excerpt VARCHAR(600) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  author VARCHAR(120) NOT NULL,
  read_time_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  thumbnail_url VARCHAR(2048) NULL,
  seo_title VARCHAR(180) NULL,
  seo_description VARCHAR(320) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_cms_posts_slug (slug),
  INDEX idx_cms_posts_status_date (status, published_at, deleted_at),
  CONSTRAINT fk_cms_post_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_testimonials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(160) NOT NULL,
  achievement VARCHAR(180) NOT NULL,
  quote_text TEXT NOT NULL,
  quote_bn TEXT NULL,
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  avatar_url VARCHAR(2048) NULL,
  course_name VARCHAR(180) NOT NULL DEFAULT '',
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  INDEX idx_cms_testimonials_status_date (status, created_at, deleted_at),
  CONSTRAINT fk_cms_testimonial_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('admin', 'cms.manage', 1),
('branch_manager', 'cms.manage', 0),
('teacher', 'cms.manage', 0),
('assistant_teacher', 'cms.manage', 0),
('accountant', 'cms.manage', 0),
('student', 'cms.manage', 0),
('guardian', 'cms.manage', 0),
('support_staff', 'cms.manage', 0);
