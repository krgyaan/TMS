ALTER TABLE maker_requests DROP CONSTRAINT maker_requests_category_id_fkey;
ALTER TABLE maker_requests ALTER COLUMN category_id TYPE VARCHAR(100);
ALTER TABLE maker_requests RENAME COLUMN category_id TO category;
