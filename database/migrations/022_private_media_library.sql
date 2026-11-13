-- Private media assets for reusable course content. Files never live under the public web root.
CREATE TABLE IF NOT EXISTS media_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_item_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename CHAR(64) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_storage_filename (storage_filename),
  INDEX idx_media_content (content_item_id, uploaded_at),
  INDEX idx_media_uploader (uploaded_by, uploaded_at),
  CONSTRAINT fk_media_content FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_media_size CHECK (size_bytes > 0 AND size_bytes <= 20971520)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
