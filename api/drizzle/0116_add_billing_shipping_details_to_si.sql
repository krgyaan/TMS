-- Migration: Sale invoice — additional billing/shipping detail fields
-- Mirrors the seller/ship-to fields available on the PO/VWO forms.

ALTER TABLE "sale_invoices"
    ADD COLUMN "billing_email" varchar(255),
    ADD COLUMN "billing_pan_no" varchar(50),
    ADD COLUMN "billing_msme_no" varchar(50),
    ADD COLUMN "billing_cin_no" varchar(50),
    ADD COLUMN "shipping_pan_no" varchar(50);