ALTER TABLE tender_result_details
    ALTER COLUMN qualified_parties_screenshot TYPE jsonb USING to_jsonb(qualified_parties_screenshot),
    ALTER COLUMN final_result_screenshot TYPE jsonb USING to_jsonb(final_result_screenshot);
