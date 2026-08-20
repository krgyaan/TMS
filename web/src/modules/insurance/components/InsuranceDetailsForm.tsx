import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useFormContext } from "react-hook-form";
import { INSURANCE_TYPE_OPTIONS } from "../helpers/insurance.schema";

const INSURANCES_CONTEXT = "insurances" as const;

export function InsuranceDetailsForm() {
    const { control, watch, setValue } = useFormContext();

    const insuranceType = watch("insuranceType") as string | undefined;
    const policyDocument = (watch("policyDocument") as string[] | undefined) ?? [];
    const lrCopy = (watch("lrCopy") as string[] | undefined) ?? [];

    return (
        <div className="border rounded-lg border-dashed p-4 space-y-4">
            <h3 className="text-lg font-semibold">Insurance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <SelectField
                    control={control}
                    name="insuranceType"
                    label={<>Insurance Type <span className="text-destructive">*</span></>}
                    placeholder="-- Select Insurance Type --"
                    options={INSURANCE_TYPE_OPTIONS}
                />
                <FieldWrapper control={control} name="policyNumber" label="Policy Number">
                    {field => (
                        <input
                            className="border-input placeholder:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Policy Number (optional)"
                            {...field}
                            value={field.value ?? ""}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name="insurerName" label="Insurer Name">
                    {field => (
                        <input
                            className="border-input placeholder:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Insurer Name (optional)"
                            {...field}
                            value={field.value ?? ""}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name="startDate" label={<>Start Date <span className="text-destructive">*</span></>}>
                    {field => (
                        <DateInput
                            value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : (field.value ?? "")}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name="endDate" label={<>End Date <span className="text-destructive">*</span></>}>
                    {field => (
                        <DateInput
                            value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : (field.value ?? "")}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name="sumAssured" label={<>Value / Sum Assured <span className="text-destructive">*</span></>}>
                    {field => <NumberInput placeholder="Sum Assured" value={field.value} onChange={field.onChange} />}
                </FieldWrapper>

                {insuranceType === "WC" && (
                    <>
                        <FieldWrapper control={control} name="noOfManpower" label="No. of Manpower">
                            {field => <NumberInput placeholder="No. of Manpower" value={field.value} onChange={field.onChange} />}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="manpowerNames" label="Names of Manpowers Covered">
                            {field => (
                                <textarea
                                className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Names of manpowers covered"
                                {...field}
                                value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="location" label="Location">
                            {field => (
                                <input
                                className="border-input placeholder:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Location"
                                {...field}
                                value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                    </>
                )}

                {insuranceType === "Storage" && (
                    <>
                        <FieldWrapper control={control} name="location" label="Warehouse Location">
                            {field => (
                                <input
                                className="border-input placeholder:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Warehouse Location"
                                {...field}
                                value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={control} name="itemsCovered" label="Items Covered">
                            {field => (
                                <textarea
                                className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Items covered"
                                {...field}
                                value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                    </>
                )}

                {insuranceType === "Open Marine" && (
                    <>
                        <FieldWrapper control={control} name="location" label="Location">
                            {field => (
                                <input
                                className="border-input placeholder:text-muted-foreground h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Location"
                                {...field}
                                value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                    </>
                )}

                <div className="space-y-2">
                    <Label>Upload Policy <span className="text-destructive">*</span></Label>
                    <FileUploader
                        context={INSURANCES_CONTEXT}
                        value={policyDocument}
                        onChange={v => setValue("policyDocument", v, { shouldValidate: true })}
                        />
                </div>
                {insuranceType === "Transit" && (
                    <div className="space-y-2">
                        <Label>LR Copy</Label>
                        <FileUploader
                            context={INSURANCES_CONTEXT}
                            value={lrCopy}
                            onChange={v => setValue("lrCopy", v, { shouldValidate: true })}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}