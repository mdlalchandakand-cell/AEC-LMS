-- Store the intended audience capacity and support one-way YouTube unlisted streams.
-- The configured limit is a scheduling target; actual provider capacity still depends
-- on the external host account and must be confirmed with its provider integration.
ALTER TABLE live_classes
  MODIFY COLUMN meeting_platform ENUM('google_meet','zoom','teams','youtube_unlisted') NOT NULL;

SELECT COUNT(*) INTO @aec_live_capacity_exists
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'live_classes' AND column_name = 'participant_limit';
SET @aec_live_capacity_sql = IF(@aec_live_capacity_exists = 0, 'ALTER TABLE live_classes ADD COLUMN participant_limit SMALLINT UNSIGNED NOT NULL DEFAULT 300 AFTER meeting_url', 'SET @aec_live_capacity_noop = 1');
PREPARE aec_live_capacity_stmt FROM @aec_live_capacity_sql;
EXECUTE aec_live_capacity_stmt;
DEALLOCATE PREPARE aec_live_capacity_stmt;
