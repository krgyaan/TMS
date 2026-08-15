import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { FileUploader } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText } from "lucide-react";
import React from "react";
import type { Control } from "react-hook-form";
import { useFormContext, useWatch } from "react-hook-form";

interface InvoiceUploadFieldProps {
    control: Control<any>;
}

export const InvoiceUploadField: React.FC<InvoiceUploadFieldProps> = ({ control }) => {
    const { setValue, formState } = useFormContext();
    const uploadInvoice = useWatch({ control, name: "uploadInvoice" });
    const invoiceFile = useWatch({ control, name: "invoiceFile" });

    return (
        <div className="rounded-lg border p-4 space-y-4">
            <Label className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Upload Invoice (if already available)
            </Label>
            <RadioGroup
                value={uploadInvoice || "no"}
                onValueChange={(v) => setValue("uploadInvoice", v as "no" | "yes")}
                className="flex gap-6"
            >
                <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="invoice-upload-yes" />
                    <Label htmlFor="invoice-upload-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="invoice-upload-no" />
                    <Label htmlFor="invoice-upload-no" className="cursor-pointer">No</Label>
                </div>
            </RadioGroup>

            {uploadInvoice === "yes" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-t pt-4">
                    <FieldWrapper control={control} name="invoiceDate" label={<>Invoice Date <span className="text-destructive">*</span></>}>
                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="invoiceValue" label={<>Value (Pre GST) <span className="text-destructive">*</span></>}>
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
                    <FieldWrapper control={control} name="invoiceGst" label={<>GST Amount <span className="text-destructive">*</span></>}>
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
                    <div className="space-y-1">
                        <FileUploader
                            label="Upload Invoice *"
                            context="tender-documents"
                            value={invoiceFile || []}
                            onChange={(paths) => setValue("invoiceFile", paths)}
                        />
                        {formState.errors.invoiceFile && (
                            <p className="text-sm text-destructive">{String(formState.errors.invoiceFile.message)}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};