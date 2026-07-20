-- ============================================
-- Migrate HRMS asset numeric keys to text keys
-- ============================================

-- ASSET TYPE
UPDATE "hrms_employee_assets" SET "asset_type" = 'laptop' WHERE "asset_type" = '1';
UPDATE "hrms_employee_assets" SET "asset_type" = 'desktop' WHERE "asset_type" = '2';
UPDATE "hrms_employee_assets" SET "asset_type" = 'mobile' WHERE "asset_type" = '3';
UPDATE "hrms_employee_assets" SET "asset_type" = 'monitor' WHERE "asset_type" = '4';
UPDATE "hrms_employee_assets" SET "asset_type" = 'keyboard' WHERE "asset_type" = '5';
UPDATE "hrms_employee_assets" SET "asset_type" = 'mouse' WHERE "asset_type" = '6';
UPDATE "hrms_employee_assets" SET "asset_type" = 'printer' WHERE "asset_type" = '7';
UPDATE "hrms_employee_assets" SET "asset_type" = 'car' WHERE "asset_type" = '8';
UPDATE "hrms_employee_assets" SET "asset_type" = 'id_card' WHERE "asset_type" = '9';
UPDATE "hrms_employee_assets" SET "asset_type" = 'access_card' WHERE "asset_type" = '10';
UPDATE "hrms_employee_assets" SET "asset_type" = 'sim_card' WHERE "asset_type" = '11';
UPDATE "hrms_employee_assets" SET "asset_type" = 'other' WHERE "asset_type" = '12';

-- ASSET STATUS
UPDATE "hrms_employee_assets" SET "asset_status" = 'assigned' WHERE "asset_status" = '1';
UPDATE "hrms_employee_assets" SET "asset_status" = 'available' WHERE "asset_status" = '2';
UPDATE "hrms_employee_assets" SET "asset_status" = 'under_repair' WHERE "asset_status" = '3';
UPDATE "hrms_employee_assets" SET "asset_status" = 'damaged' WHERE "asset_status" = '4';
UPDATE "hrms_employee_assets" SET "asset_status" = 'lost' WHERE "asset_status" = '5';
UPDATE "hrms_employee_assets" SET "asset_status" = 'returned' WHERE "asset_status" = '6';
UPDATE "hrms_employee_assets" SET "asset_status" = 'disposed' WHERE "asset_status" = '7';

-- ASSET CONDITION
UPDATE "hrms_employee_assets" SET "asset_condition" = 'new' WHERE "asset_condition" = '1';
UPDATE "hrms_employee_assets" SET "asset_condition" = 'good' WHERE "asset_condition" = '2';
UPDATE "hrms_employee_assets" SET "asset_condition" = 'fair' WHERE "asset_condition" = '3';
UPDATE "hrms_employee_assets" SET "asset_condition" = 'poor' WHERE "asset_condition" = '4';
UPDATE "hrms_employee_assets" SET "asset_condition" = 'damaged' WHERE "asset_condition" = '5';

-- ASSET CATEGORY
UPDATE "hrms_employee_assets" SET "asset_category" = 'it_equipment' WHERE "asset_category" = '1';
UPDATE "hrms_employee_assets" SET "asset_category" = 'office_furniture' WHERE "asset_category" = '2';
UPDATE "hrms_employee_assets" SET "asset_category" = 'vehicle' WHERE "asset_category" = '3';
UPDATE "hrms_employee_assets" SET "asset_category" = 'stationery' WHERE "asset_category" = '4';

-- ASSET LOCATION
UPDATE "hrms_employee_assets" SET "asset_location" = 'office' WHERE "asset_location" = '1';
UPDATE "hrms_employee_assets" SET "asset_location" = 'home' WHERE "asset_location" = '2';
UPDATE "hrms_employee_assets" SET "asset_location" = 'field' WHERE "asset_location" = '3';
UPDATE "hrms_employee_assets" SET "asset_location" = 'warehouse' WHERE "asset_location" = '4';
UPDATE "hrms_employee_assets" SET "asset_location" = 'repair_center' WHERE "asset_location" = '5';

-- DISPOSAL TYPE
UPDATE "hrms_employee_assets" SET "disposal_type" = 'sold' WHERE "disposal_type" = '1';
UPDATE "hrms_employee_assets" SET "disposal_type" = 'scrapped' WHERE "disposal_type" = '2';
UPDATE "hrms_employee_assets" SET "disposal_type" = 'donated' WHERE "disposal_type" = '3';
UPDATE "hrms_employee_assets" SET "disposal_type" = 'destroyed' WHERE "disposal_type" = '4';
UPDATE "hrms_employee_assets" SET "disposal_type" = 'write_off' WHERE "disposal_type" = '5';
UPDATE "hrms_employee_assets" SET "disposal_type" = 'returned_to_vendor' WHERE "disposal_type" = '6';

-- ============================================
-- ASSET TRACKING HISTORY
-- ============================================

-- STATUS
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'assigned' WHERE "new_status" = '1';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'available' WHERE "new_status" = '2';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'under_repair' WHERE "new_status" = '3';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'damaged' WHERE "new_status" = '4';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'lost' WHERE "new_status" = '5';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'returned' WHERE "new_status" = '6';
UPDATE "hrms_asset_tracking_history" SET "new_status" = 'disposed' WHERE "new_status" = '7';

UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'assigned' WHERE "previous_status" = '1';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'available' WHERE "previous_status" = '2';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'under_repair' WHERE "previous_status" = '3';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'damaged' WHERE "previous_status" = '4';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'lost' WHERE "previous_status" = '5';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'returned' WHERE "previous_status" = '6';
UPDATE "hrms_asset_tracking_history" SET "previous_status" = 'disposed' WHERE "previous_status" = '7';

-- RETURN CONDITION
UPDATE "hrms_asset_tracking_history" SET "return_condition" = 'new' WHERE "return_condition" = '1';
UPDATE "hrms_asset_tracking_history" SET "return_condition" = 'good' WHERE "return_condition" = '2';
UPDATE "hrms_asset_tracking_history" SET "return_condition" = 'fair' WHERE "return_condition" = '3';
UPDATE "hrms_asset_tracking_history" SET "return_condition" = 'poor' WHERE "return_condition" = '4';

-- ASSET CONDITION AFTER
UPDATE "hrms_asset_tracking_history" SET "asset_condition_after" = 'new' WHERE "asset_condition_after" = '1';
UPDATE "hrms_asset_tracking_history" SET "asset_condition_after" = 'good' WHERE "asset_condition_after" = '2';
UPDATE "hrms_asset_tracking_history" SET "asset_condition_after" = 'fair' WHERE "asset_condition_after" = '3';
UPDATE "hrms_asset_tracking_history" SET "asset_condition_after" = 'poor' WHERE "asset_condition_after" = '4';

-- DAMAGE TYPE
UPDATE "hrms_asset_tracking_history" SET "damage_type" = 'physical' WHERE "damage_type" = '1';
UPDATE "hrms_asset_tracking_history" SET "damage_type" = 'water' WHERE "damage_type" = '2';
UPDATE "hrms_asset_tracking_history" SET "damage_type" = 'electrical' WHERE "damage_type" = '3';
UPDATE "hrms_asset_tracking_history" SET "damage_type" = 'software' WHERE "damage_type" = '4';

-- DISPOSAL TYPE
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'sold' WHERE "disposal_type" = '1';
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'scrapped' WHERE "disposal_type" = '2';
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'donated' WHERE "disposal_type" = '3';
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'destroyed' WHERE "disposal_type" = '4';
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'write_off' WHERE "disposal_type" = '5';
UPDATE "hrms_asset_tracking_history" SET "disposal_type" = 'returned_to_vendor' WHERE "disposal_type" = '6';

-- ASSET LOCATION (history table)
UPDATE "hrms_asset_tracking_history" SET "asset_location" = 'office' WHERE "asset_location" = '1';
UPDATE "hrms_asset_tracking_history" SET "asset_location" = 'home' WHERE "asset_location" = '2';
UPDATE "hrms_asset_tracking_history" SET "asset_location" = 'field' WHERE "asset_location" = '3';
UPDATE "hrms_asset_tracking_history" SET "asset_location" = 'warehouse' WHERE "asset_location" = '4';
UPDATE "hrms_asset_tracking_history" SET "asset_location" = 'repair_center' WHERE "asset_location" = '5';
