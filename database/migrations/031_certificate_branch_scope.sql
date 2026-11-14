-- Add branch ownership to certificates so certificate staff can only manage
-- records issued for their own active branch. Backfill legacy certificates from
-- their course before enabling branch-scoped API queries.
SELECT COUNT(*) INTO @aec_cert_exists
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'branch_id';
SET @aec_cert_sql = IF(@aec_cert_exists = 0, 'ALTER TABLE certificates ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER course_id', 'SET @aec_cert_noop = 1');
PREPARE aec_cert_stmt FROM @aec_cert_sql;
EXECUTE aec_cert_stmt;
DEALLOCATE PREPARE aec_cert_stmt;

UPDATE certificates AS certificate
INNER JOIN courses AS course ON course.id = certificate.course_id
SET certificate.branch_id = course.branch_id
WHERE certificate.branch_id IS NULL AND course.branch_id IS NOT NULL;

SELECT COUNT(*) INTO @aec_cert_exists
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'certificates' AND index_name = 'idx_certificates_branch_status';
SET @aec_cert_sql = IF(@aec_cert_exists = 0, 'ALTER TABLE certificates ADD INDEX idx_certificates_branch_status (branch_id, status, issued_at)', 'SET @aec_cert_noop = 1');
PREPARE aec_cert_stmt FROM @aec_cert_sql;
EXECUTE aec_cert_stmt;
DEALLOCATE PREPARE aec_cert_stmt;

SELECT COUNT(*) INTO @aec_cert_exists
FROM information_schema.table_constraints
WHERE table_schema = DATABASE() AND table_name = 'certificates' AND constraint_name = 'fk_certificates_branch' AND constraint_type = 'FOREIGN KEY';
SET @aec_cert_sql = IF(@aec_cert_exists = 0, 'ALTER TABLE certificates ADD CONSTRAINT fk_certificates_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT', 'SET @aec_cert_noop = 1');
PREPARE aec_cert_stmt FROM @aec_cert_sql;
EXECUTE aec_cert_stmt;
DEALLOCATE PREPARE aec_cert_stmt;
