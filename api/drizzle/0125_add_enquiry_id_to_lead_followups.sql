ALTER TABLE "lead_followups" ADD COLUMN "enquiry_id" bigint REFERENCES "lead_enquiries"("id") ON DELETE CASCADE;
