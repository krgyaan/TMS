-- Change filled_bg_format and contract_agreement_format from varchar to jsonb
-- to support file uploads (array of file paths) instead of plain text

ALTER TABLE wo_details
  ALTER COLUMN filled_bg_format TYPE jsonb USING
    CASE
      WHEN filled_bg_format IS NOT NULL AND filled_bg_format != ''
      THEN to_jsonb(ARRAY[filled_bg_format])
      ELSE '[]'::jsonb
    END,
  ALTER COLUMN contract_agreement_format TYPE jsonb USING
    CASE
      WHEN contract_agreement_format IS NOT NULL AND contract_agreement_format != ''
      THEN to_jsonb(ARRAY[contract_agreement_format])
      ELSE '[]'::jsonb
    END;
