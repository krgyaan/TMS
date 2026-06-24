import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Input } from "@/components/ui/input";
import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { useProjectPurchaseOrders } from "@/hooks/api/useProjectDashboard";
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
    projectId: number;
}

export const PaymentAgainstField: React.FC<PaymentAgainstFieldProps> = ({ control, projectId }) => {
    const { watch, setValue } = useFormContext();
    const paymentAgainst = watch("paymentAgainst");
    const { data: poData } = useProjectPurchaseOrders(projectId);
    const poOptions = (poData?.purchaseOrders || []).map((po: any) => ({
        id: String(po.id),
        name: `${po.poNumber} - ${po.sellerName}`,
    }));

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
                <>
                    <p className="text-muted-foreground text-xs">Select an existing PO Number, or upload an older PO if you have one.</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                        <SelectField
                            control={control}
                            name="selectedPoId"
                            label="Select PO"
                            options={poOptions}
                            placeholder="Choose a PO..."
                        />
                        <TenderFileUploader
                            label="Upload PO Document"
                            context="tender-documents"
                            value={watch("poFile")}
                            onChange={(paths) => setValue("poFile", paths)}
                        />
                    </div>
                </>
            )}
        </div>
    );
};
