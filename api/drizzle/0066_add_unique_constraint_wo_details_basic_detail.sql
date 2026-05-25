-- Add UNIQUE constraint on wo_details.wo_basic_detail_id to prevent duplicate entries
-- First drop the existing index, then create a unique index
DROP INDEX IF EXISTS idx_wo_details_basic_detail;
CREATE UNIQUE INDEX uq_wo_details_basic_detail ON wo_details (wo_basic_detail_id);
