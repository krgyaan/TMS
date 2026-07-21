ALTER TABLE tender_result_details
    ALTER COLUMN qualified_parties_screenshot TYPE jsonb
        USING CASE WHEN qualified_parties_screenshot IS NOT NULL
            THEN jsonb_build_array(qualified_parties_screenshot) ELSE NULL END,
    ALTER COLUMN final_result_screenshot TYPE jsonb
        USING CASE WHEN final_result_screenshot IS NOT NULL
            THEN jsonb_build_array(final_result_screenshot) ELSE NULL END;
