-- Add reference_entity_id column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_entity_id VARCHAR(100);
