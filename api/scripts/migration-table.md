| Filename | Journal idx | Array Pos | Status | One-Line Summary |
|---|---|---|---|---|
| `0000_material_the_fallen.sql` | 0 | 0 | Tracked | CREATE ENUM incomplete_field_status; CREATE ENUM instrument_status (+54 more) |
| `0001_remarkable_kitty_pryde.sql` | 1 | 1 | Tracked | EMPTY |
| `0002_left_bullseye.sql` | 2 | 2 | Tracked | EMPTY |
| `0003_fine_chat.sql` | 3 | 3 | Tracked | EMPTY |
| `0004_overjoyed_thing.sql` | 4 | 4 | Tracked | CREATE TABLE client_directory |
| `0030_brave_kree.sql` | 30 | 5 | Tracked | ALTER instrument_bg_details.prefilled_signed_bg; ADD instrument_bg_details.bg_needs (+72 more) |
| `0031_smiling_deathbird.sql` | 31 | 6 | Tracked | ADD payment_instruments.status; DROP payment_instruments.instrument_status |
| `0032_conscious_colleen_wing.sql` | 32 | 7 | Tracked | ALTER statuses.tender_category |
| `0033_foamy_lizard.sql` | 33 | 8 | Tracked | ADD tender_information.processing_fee_required; ADD tender_information.tender_fee_required (+10 more) |
| `0034_wandering_hannibal_king.sql` | 34 | 9 | Tracked | ALTER tender_information.processing_fee_required; DROP tender_information.client_organisation |
| `0035_add_po_product_unit.sql` | - | - | **UNTRACKED** | ADD purchase_order_products.unit |
| `0035_lyrical_stranger.sql` | 35 | 10 | Tracked | ADD tender_clients.client_organisation |
| `0036_lumpy_black_tarantula.sql` | 36 | 11 | Tracked | ALTER instrument_bg_details.cash_margin_percent; ALTER instrument_bg_details.fdr_margin_percent (+19 more) |
| `0037_shocking_blackheart.sql` | 37 | 12 | Tracked | CREATE TABLE instrument_status_history; ALTER instrument_bg_details.bg_soft_copy (+54 more) |
| `0038_overconfident_hex.sql` | 38 | 13 | Tracked | DROP TABLE instrument_status_history; ALTER instrument_bg_details.bg_soft_copy (+58 more) |
| `0039_fixed_scarecrow.sql` | 39 | 14 | Tracked | CREATE TABLE instrument_status_history |
| `0040_colossal_scorpion.sql` | 40 | 15 | Tracked | CREATE TABLE user_roles |
| `0041_slim_whizzer.sql` | 41 | 16 | Tracked | CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING  |
| `0042_groovy_karma.sql` | 42 | 17 | Tracked | CREATE TABLE permissions; CREATE TABLE role_permissions (+1 more) |
| `0043_spooky_mad_thinker.sql` | 43 | 18 | Tracked | ADD rfq_response_items.item_id |
| `0044_broad_jackpot.sql` | 44 | 19 | Tracked | CREATE ENUM entity_type; CREATE ENUM timer_status (+9 more) |
| `0045_bumpy_leader.sql` | 45 | 20 | Tracked | CREATE ENUM bid_submission_status; CREATE ENUM costing_sheet_status (+6 more) |
| `0046_nice_next_avengers.sql` | 46 | 21 | Tracked | ALTER TABLE "tender_costing_sheets" RENAME COLUMN "oem_vendo |
| `0047_majestic_gressill.sql` | 47 | 22 | Tracked | ALTER tender_costing_sheets.status; CREATE ENUM costing_sheet_status |
| `0048_tearful_rattler.sql` | 48 | 23 | Tracked | CREATE TABLE employee_imprests; ALTER tender_document_checklists.tender_id (+2 more) |
| `0049_amazing_nicolaos.sql` | 49 | 24 | Tracked | ALTER tender_queries.tq_submission_deadline; ALTER tender_queries.status |
| `0050_spotty_carlie_cooper.sql` | 50 | 25 | Tracked | CREATE TABLE reverse_auctions; CREATE TABLE tender_results |
| `0051_quiet_marvel_zombies.sql` | 53 | 28 | Tracked | ALTER tender_infos.team_member |
| `0051_yellow_captain_america.sql` | 51 | 26 | Tracked | CREATE ENUM assignment_status; CREATE ENUM frequency_type (+6 more) |
| `0052_needy_archangel.sql` | 54 | 29 | Tracked | CREATE ENUM tq_status |
| `0052_unique_blindfold.sql` | 52 | 27 | Tracked | ALTER couriers.id; ALTER follow_ups.id |
| `0055_secret_captain_marvel.sql` | 55 | 30 | Tracked | CREATE TABLE follow_up_persons; ALTER couriers.id (+18 more) |
| `0056_misty_talkback.sql` | 56 | 31 | Tracked | CREATE TABLE employee_imprest_transactions; ALTER employee_imprests.user_id (+5 more) |
| `0057_first_photon.sql` | 57 | 32 | Tracked | ENUM ADD tq_status |
| `0058_increase_client_mobile_length.sql` | 58 | 33 | Tracked | ALTER tender_clients.client_mobile |
| `0059_add_delivery_method_to_cheque.sql` | 59 | 34 | Tracked | ADD instrument_cheque_details.delivery_method |
| `0060_add_team_to_payment_requests.sql` | - | - | **UNTRACKED** | ADD payment_requests.team |
| `0061_add_cheque_action_fields.sql` | - | - | **UNTRACKED** | ADD instrument_cheque_details.cheque_given_from_account; ADD instrument_cheque_details.proof_image |
| `0062_add_remarks_to_instrument_cheque_details.sql` | - | - | **UNTRACKED** | ADD instrument_cheque_details.remarks |
| `0063_drop_budget_from_wo_details.sql` | 60 | 35 | Tracked | DROP wo_details.budget_pre_gst; DROP wo_details.budget_supply (+4 more) |
| `0064_add_fields_to_wo_basic_details.sql` | - | - | **UNTRACKED** | ADD wo_basic_details.final_price; ADD wo_basic_details.budget_supply (+5 more) |
| `0065_add_buyback_boq_applicable.sql` | - | - | **UNTRACKED** | ADD wo_details.buyback_boq_applicable |
| `0066_add_unique_constraint_wo_details_basic_detail.sql` | - | - | **UNTRACKED** | DROP INDEX IF EXISTS idx_wo_details_basic_detail; |
| `0067_fix_payment_instrument_default_status.sql` | 61 | 36 | Tracked | ALTER payment_instruments.status |
| `0068_add_missing_permission_modules.sql` | - | - | **UNTRACKED** | INSERT INTO "permissions" ("module", "action", "description" |
| `0069_drop_generated_pdf_from_purchase_orders.sql` | - | - | **UNTRACKED** | DROP purchase_orders.generated_pdf; DROP vendor_work_orders.generated_pdf |
| `0070_add_alias_to_project_parties.sql` | - | - | **UNTRACKED** | ADD project_parties.alias |
| `0070_add_tender_costing_details.sql` | 62 | 37 | Tracked | CREATE TABLE tender_costing_details |
| `0071_drop_old_costing_sheet_columns.sql` | 63 | 38 | Tracked | DROP tender_costing_sheets.status; DROP tender_costing_sheets.submitted_final_price (+14 more) |
| `0072_add_cert_recipients_to_po_vwo.sql` | - | - | **UNTRACKED** | ADD purchase_orders.cert_recipients; ADD vendor_work_orders.cert_recipients |
| `0073_add_tender_result_details.sql` | 72 | 47 | Tracked | CREATE TABLE tender_result_details |
| `0073_create_beneficiaries_table.sql` | - | - | **UNTRACKED** | CREATE TABLE project_beneficiaries; ADD project_payment_requests.bank_name (+1 more) |
| `0074_add_purchase_order_id_to_payment_requests.sql` | - | - | **UNTRACKED** | ADD project_payment_requests.purchase_order_id |
| `0074_drop_old_result_columns.sql` | 70 | 45 | Tracked | DROP tender_results.result; DROP tender_results.l1_price (+6 more) |
| `0075_add_utr_and_rejection_to_payment_requests.sql` | - | - | **UNTRACKED** | ALTER TABLE project_payment_requests |
| `0075_change_screenshots_to_jsonb.sql` | 71 | 46 | Tracked | ALTER TABLE tender_result_details |
| `0076_create_maker_requests_table.sql` | - | - | **UNTRACKED** | CREATE TABLE maker_requests |
| `0077_change_bg_and_ca_format_to_jsonb.sql` | - | - | **UNTRACKED** | ALTER TABLE wo_details |
| `0078_add_team_to_po_vwo.sql` | - | - | **UNTRACKED** | ADD purchase_orders.team; ADD vendor_work_orders.team |
| `0079_add_payment_mode_and_portal_link_to_maker_requests.sql` | - | - | **UNTRACKED** | ADD maker_requests.payment_mode; ADD maker_requests.portal_link |
| `0080_rename_category_id_to_category_in_maker_requests.sql` | - | - | **UNTRACKED** | ALTER maker_requests.category_id |
| `0081_add_dd_fdr_to_payment_purpose_enum.sql` | 64 | 39 | Tracked | ENUM ADD payment_purpose |
| `0081_add_tds_to_purchase_orders.sql` | - | - | **UNTRACKED** | ALTER TABLE purchase_orders |
| `0082_add_po_type_and_pi_attachments.sql` | 65 | 40 | Tracked | ALTER TABLE purchase_orders |
| `0083_add_category_to_purchase_orders.sql` | 66 | 41 | Tracked | ADD purchase_orders.category |
| `0084_add_vendor_work_order_id_to_payment_requests.sql` | 67 | 42 | Tracked | ADD project_payment_requests.vendor_work_order_id |
| `0085_change_qty_to_numeric.sql` | 68 | 43 | Tracked | ALTER purchase_order_products.qty; ALTER vendor_work_order_items.qty |
| `0086_add_po_approval_fields.sql` | 69 | 44 | Tracked | ADD purchase_orders.po_approved; ADD purchase_orders.po_approval_remark |
| `0087_create_sale_invoices_tables.sql` | 73 | 48 | Tracked | CREATE TABLE sale_invoices; CREATE TABLE sale_invoice_items |
| `0088_add_missing_purchase_order_id_columns.sql` | 74 | 49 | Tracked | ADD project_purchase_invoices.purchase_order_id; ADD purchase_order_products.purchase_order_id (+1 more) |
| `0089_add_action_logs_to_sale_invoices.sql` | 75 | 50 | Tracked | ADD sale_invoices.action_logs |
| `0090_add_disposal_columns.sql` | 76 | 51 | Tracked | ALTER TABLE "hrms_employee_assets" |
| `0091_add_type_specs.sql` | 77 | 52 | Tracked | ADD hrms_employee_assets.type_specs |
| `0092_migrate_asset_keys_to_text.sql` | 78 | 53 | Tracked | UPDATE "hrms_employee_assets" SET "asset_type" = 'laptop' WH |
| `0093_unify_payment_requests.sql` | 79 | 54 | Tracked | ALTER project_payment_requests.project_id; ADD project_payment_requests.payment_mode (+2 more) |
| `0094_add_category_to_vendor_work_orders.sql` | 80 | 55 | Tracked | ADD vendor_work_orders.category |
| `0095_remove_designations_add_team_category.sql` | 81 | 56 | Tracked | DROP user_profiles.designation_id; DROP TABLE designations (+1 more) |
| `0096_move_role_id_to_users.sql` | - | - | **UNTRACKED** | ADD users.role_id; DROP TABLE user_roles |
| `0097_fill_missing_crud_permissions.sql` | - | - | **UNTRACKED** | INSERT INTO permissions (module, action, description) |
| `0098_add_remaining_sidebar_permissions.sql` | - | - | **UNTRACKED** | INSERT INTO "permissions" ("module", "action", "description" |
| `0099_add_vwo_approval_fields.sql` | 57 | 57 | Tracked | ADD vendor_work_orders.tds_percentage; ADD vendor_work_orders.tds_amount (+3 more) |
| `0100_add_quotation_id_to_followups.sql` | 82 | 58 | Tracked | ADD follow_ups.quotation_id |
| `0100_add_upload_fields_to_payment_requests.sql` | - | - | **UNTRACKED** | ADD project_payment_requests.upload_invoice; ADD project_payment_requests.upload_pi (+1 more) |
| `0101_add_vendor_work_order_id_to_purchase_invoices.sql` | - | - | **UNTRACKED** | ADD project_purchase_invoices.vendor_work_order_id |
| `0102_add_contact_fields_to_project_parties.sql` | - | - | **UNTRACKED** | ADD project_parties.contact_person; ADD project_parties.mobile_number |
| `0103_add_amc_tables.sql` | 83 | 59 | Tracked | CREATE ENUM amc_bill_type; CREATE TABLE amc (+4 more) |
| `0103_add_is_active_to_project_parties.sql` | - | - | **UNTRACKED** | ADD project_parties.is_active |
| `0104_add_amc_completed_services.sql` | - | - | **UNTRACKED** | CREATE TABLE amc_completed_services |
| `0104_add_beneficiary_user_link.sql` | - | - | **UNTRACKED** | ADD project_beneficiaries.user_id; ADD project_payment_requests.beneficiary_id |
| `0105_add_amc_contacts_and_te_allocation.sql` | - | - | **UNTRACKED** | ADD amc.allocated_te; ALTER amc_contacts.amc_site_id (+4 more) |
| `0106_backfill_imprest_expense_and_week_lock_permission.sql` | - | - | **UNTRACKED** | UPDATE "employee_imprests" |
| `0106_create_amc_services_and_amc_bill.sql` | - | - | **UNTRACKED** | CREATE TABLE amc_services; CREATE TABLE amc_bill |
| `0107_drop_amc_completed_services.sql` | - | - | **UNTRACKED** | DROP TABLE amc_completed_services |
| `0108_multi_invoice_receipt.sql` | - | - | **UNTRACKED** | DROP amc_bill.invoice |
| `0109_create_customer_complaints_tables.sql` | - | - | **UNTRACKED** | CREATE TABLE customer_complaints; CREATE TABLE service_engineers |
| `0110_create_conference_call_reports.sql` | - | - | **UNTRACKED** | CREATE TABLE service_conference_call_reports |
| `0111_create_service_reports.sql` | - | - | **UNTRACKED** | CREATE TABLE service_reports |
| `0112_create_service_customer_feedback.sql` | - | - | **UNTRACKED** | CREATE TABLE service_customer_feedback |
| `0113_create_insurance_policies.sql` | - | - | **UNTRACKED** | CREATE TABLE insurance_policies; ADD employee_imprests.insurance_policy_id |
| `0114_add_client_directory_fields.sql` | - | - | **UNTRACKED** | ADD client_directory.designation; ADD client_directory.address (+2 more) |
| `0114_create_project_closure_documents.sql` | - | - | **UNTRACKED** | CREATE TABLE project_closure_documents |
| `0115_add_happy_calling.sql` | - | - | **UNTRACKED** | CREATE TABLE happy_calling |
| `0115_add_si_inventory_link_and_draft_flow.sql` | - | - | **UNTRACKED** | ALTER TABLE "sale_invoice_items" |
| `0116_add_billing_shipping_details_to_si.sql` | - | - | **UNTRACKED** | ALTER TABLE "sale_invoices" |
| `0116_add_broadcasts.sql` | - | - | **UNTRACKED** | CREATE TABLE broadcasts |
| `0117_add_followup_source_columns.sql` | - | - | **UNTRACKED** | ALTER TABLE "public"."lead_followups" ADD COLUMN "happy_call |
| `0118_add_happy_calling_id_to_lead_enquiries.sql` | - | - | **UNTRACKED** | ENUM ADD contact_source |
| `0119_add_enquiry_type_to_lead_enquiries.sql` | - | - | **UNTRACKED** | ALTER TABLE "public"."lead_enquiries" ADD COLUMN "enquiry_ty |
| `0120_add_project_link_to_insurance_policies.sql` | - | - | **UNTRACKED** | ADD insurance_policies.project_id; ADD insurance_policies.payment_request_id |
| `0120_add_tender_id_to_lead_enquiries.sql` | - | - | **UNTRACKED** | ALTER TABLE "public"."lead_enquiries" ADD COLUMN "tender_id" |
| `0121_add_due_date_to_lead_enquiries.sql` | - | - | **UNTRACKED** | ALTER TABLE "public"."lead_enquiries" ADD COLUMN "due_date"  |
| `0121_add_insurance_policy_links.sql` | - | - | **UNTRACKED** | CREATE TABLE insurance_policy_links |
| `0122_add_project_id_to_employee_imprests.sql` | - | - | **UNTRACKED** | ADD employee_imprests.project_id |
| `0123_add_live_location_to_leads.sql` | - | - | **UNTRACKED** | ADD leads.live_location |
| `0124_add_created_by_and_drop_happy_calling_dates.sql` | - | - | **UNTRACKED** | ALTER TABLE "public"."client_directory" ADD COLUMN "created_ |
| `0124_drop_enquiry_costing_quotation.sql` | - | - | **UNTRACKED** | DROP follow_ups.quotation_id; DROP TABLE private_quotes (+1 more) |
| `0125_add_enquiry_id_to_lead_followups.sql` | - | - | **UNTRACKED** | ADD lead_followups.enquiry_id |
| `0126_drop_enquiry_results.sql` | - | - | **UNTRACKED** | DROP TABLE enquiry_results |
| `0127_add_path_to_company_documents.sql` | 84 | 60 | Tracked | ALTER TABLE "public"."company_documents" ADD COLUMN "path" v |
| `0127_create_password_reset_otps.sql` | 86 | 62 | Tracked | CREATE TABLE password_reset_otps |
| `0128_drop_companies_and_documents.sql` | 85 | 61 | Tracked | DROP TABLE public |
| `0129_add_employee_imprest_voucher_items.sql` | 87 | 63 | Tracked | CREATE TABLE employee_imprest_voucher_items |
| `0129_add_lead_followup_status.sql` | - | - | **UNTRACKED** | ADD lead_followups.subject; ADD lead_followups.status (+2 more) |
| `0130_backfill_date_of_expense_strict.sql` | 88 | 64 | Tracked | ALTER employee_imprests.date_of_expense |
| `0131_require_imprest_remark.sql` | 89 | 65 | Tracked | ALTER employee_imprests.remark |
| `0132_dedup_vouchers_unique_week.sql` | 90 | 66 | Tracked | WITH ranked AS ( |
| `0133_add_insurance_required_to_projects.sql` | 91 | 67 | Tracked | ADD projects.insurance_required; ADD projects.insurance_required_remark |
| `0134_create_inventory_tables.sql` | 92 | 68 | Tracked | CREATE TABLE inventory; CREATE TABLE inventory_movements (+1 more) |
| `0135_create_claude_token_usage.sql` | 93 | 69 | Tracked | CREATE TABLE claude_token_usage |
