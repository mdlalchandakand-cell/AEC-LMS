-- Private PDF assets for the storefront e-book library.
CREATE TABLE IF NOT EXISTS ebook_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ebook_id VARCHAR(80) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebook_files_ebook_id (ebook_id),
  UNIQUE KEY uq_ebook_files_storage_filename (storage_filename),
  INDEX idx_ebook_files_uploaded_by (uploaded_by, uploaded_at),
  CONSTRAINT fk_ebook_file_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_ebook_file_size_positive CHECK (size_bytes > 0 AND size_bytes <= 20971520)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
