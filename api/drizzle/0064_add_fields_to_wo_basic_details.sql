-- New pricing field
ALTER TABLE "wo_basic_details" ADD COLUMN "final_price" numeric(20,2);

-- Budget breakdown (moved from wo_details, columns dropped in 0063)
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_supply" numeric(20,2);
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_service" numeric(20,2);
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_freight" numeric(20,2);
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_admin" numeric(20,2);
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_buyback_sale" numeric(20,2);
ALTER TABLE "wo_basic_details" ADD COLUMN "budget_gem_charges" numeric(20,2);
