import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { paymentAgainstOptions } from "../helpers/paymentRequest.schema";

const BUDGET_CATEGORIES = [
    { id: "Supply", name: "Supply" },
    { id: "Service", name: "Service" },
    { id: "Freight", name: "Freight" },
    { id: "Admin/Misc.", name: "Admin/Misc." },
    { id: "Buyback/Sale", name: "Buyback/Sale" },
    { id: "GEM Charges", name: "GEM Charges" },
];

const PAYMENT_AGAINST_OPTIONS = paymentAgainstOptions.map(o => ({ id: o.value, name: o.label }));

interface PaymentAgainstFieldProps {
    control: Control<any>;
}

export const PaymentAgainstField: React.FC<PaymentAgainstFieldProps> = ({ control }) => {
    const { watch, setValue } = useFormContext();
    const paymentAgainst = watch("paymentAgainst");

    return (
        <div className="space-y-4">
            <div className="max-w-md">
                <SelectField
                    control={control}
                    name="paymentAgainst"
                    label="Payment Against"
                    options={PAYMENT_AGAINST_OPTIONS}
                    placeholder="Select payment type..."
                />
            </div>

            {paymentAgainst === "upload_invoice" && (
                <TenderFileUploader
                    label="Upload Invoice Document"
                    context="tender-documents"
                    value={watch("uploadedInvoiceFile")}
                    onChange={(paths) => setValue("uploadedInvoiceFile", paths)}
                />
        )}

            {paymentAgainst === "new_pi" && (
                <>
                    <h4 className="text-md font-semibold">Purchase Invoice Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="col-span-4 max-w-sm">
                            <SelectField
                                control={control}
                                name="pi_category"
                                label="Category"
                                options={BUDGET_CATEGORIES}
                                placeholder="Select category..."
                            />
                        </div>
                        <FieldWrapper control={control} name="pi_partyName" label="Party Name">
                            {(field) => <Input {...field} placeholder="Enter party name" />}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="pi_valuePreGst" label="Value (Pre GST)">
                            {(field) => (
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="pi_gstAmount" label="GST Amount">
                            {(field) => (
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="pi_invoiceDate" label="Invoice Date">
                            {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                        </FieldWrapper>
                        <TenderFileUploader
                            label="Upload Invoice"
                            context="tender-documents"
                            value={watch("pi_invoiceFile")}
                            onChange={(paths) => setValue("pi_invoiceFile", paths)}
                        />
                    </div>
                </>
            )}

            {paymentAgainst === "po" && (
                <TenderFileUploader
                    label="Upload PO Document"
                    context="tender-documents"
                    value={watch("poFile")}
                    onChange={(paths) => setValue("poFile", paths)}
                />
            )}

            {paymentAgainst === "others" && (
                <FieldWrapper control={control} name="remark" label="Remark">
                    {(field) => <Textarea {...field} placeholder="Enter remark for other payment type..." rows={3} />}
                </FieldWrapper>
            )}
        </div>
    );
};
