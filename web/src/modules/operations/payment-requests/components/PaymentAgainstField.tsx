import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { paymentAgainstOptions } from "../helpers/paymentRequest.schema";

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
                <div className="border rounded-lg border-dashed p-4 space-y-2">
                    <Label>Upload Purchase Invoice</Label>
                    <TenderFileUploader
                        label="Upload Invoice Document"
                        context="tender-documents"
                        value={watch("uploadedInvoiceFile")}
                        onChange={(paths) => setValue("uploadedInvoiceFile", paths)}
                    />
                </div>
            )}

            {paymentAgainst === "new_pi" && (
                <div className="border rounded-lg border-dashed p-4 space-y-2">
                    <Label>Purchase Invoice Reference</Label>
                    <p className="text-sm text-muted-foreground">
                        Create a purchase invoice first via the Purchase Invoice form.
                        After creation, enter the Purchase Invoice ID here:
                    </p>
                    <FieldWrapper control={control} name="purchaseInvoiceId" label="Purchase Invoice ID">
                        {(field) => (
                            <input
                                {...field}
                                type="number"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Enter Purchase Invoice ID"
                            />
                        )}
                    </FieldWrapper>
                </div>
            )}

            {paymentAgainst === "po" && (
                <div className="border rounded-lg border-dashed p-4 space-y-2">
                    <Label>Upload PO Document</Label>
                    <TenderFileUploader
                        label="Upload PO Document"
                        context="tender-documents"
                        value={watch("poFile")}
                        onChange={(paths) => setValue("poFile", paths)}
                    />
                </div>
            )}

            {paymentAgainst === "others" && (
                <div className="border rounded-lg border-dashed p-4 space-y-2">
                    <FieldWrapper control={control} name="remark" label="Remark">
                        {(field) => <Textarea {...field} placeholder="Enter remark for other payment type..." rows={3} />}
                    </FieldWrapper>
                </div>
            )}
        </div>
    );
};
