-- Persistent storefront purchase requests. Premium ebook access is granted only after staff verification.
CREATE TABLE IF NOT EXISTS ebook_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  ebook_id VARCHAR(80) NOT NULL,
  ebook_title VARCHAR(180) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('bKash','Nagad') NOT NULL,
  trx_id VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  verified_by BIGINT UNSIGNED NULL,
  verified_at DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebook_orders_trx_id (trx_id),
  INDEX idx_ebook_orders_user_status (user_id, status, created_at),
  INDEX idx_ebook_orders_ebook_status (ebook_id, status),
  CONSTRAINT fk_ebook_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ebook_order_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_ebook_order_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(80) NOT NULL,
  product_title VARCHAR(180) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address VARCHAR(1000) NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_orders_status_created (status, created_at),
  INDEX idx_product_orders_user_created (user_id, created_at),
  CONSTRAINT fk_product_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_order_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_product_order_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_product_order_amount_positive CHECK (unit_price > 0 AND total_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_permissions (role, permission_key, allowed) VALUES
('super_admin', 'storefront.orders.manage', 1),
('admin', 'storefront.orders.manage', 1),
('branch_manager', 'storefront.orders.manage', 0),
('teacher', 'storefront.orders.manage', 0),
('assistant_teacher', 'storefront.orders.manage', 0),
('accountant', 'storefront.orders.manage', 0),
('student', 'storefront.orders.manage', 0),
('guardian', 'storefront.orders.manage', 0),
('support_staff', 'storefront.orders.manage', 0);
