import { type Control, type FieldPath, type FieldValues, useFormContext, useWatch } from "react-hook-form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatVendorName } from "@/lib/vendorName";
import { isRealMsmeNumber } from "@/modules/master/vendor-master/helpers/msme";

const MSME_TYPE_OPTIONS = [
    { value: "M", label: "Manufacturer" },
    { value: "S", label: "Service" },
    { value: "T", label: "Trading" },
] as const;

const CATEGORY_OPTIONS = [
    "AC Team Supplier",
    "Accounts & Admin",
    "DC Team Supplier",
    "Transporter services",
    "TDS Recovery category",
    "Defaulter Creditor",
    "AC Technical service provider",
    "Sundry Creditors",
    "DC Technical service provider",
    "Landlords",
    "Contractor for Sundry Creditors",
    "Related Party",
] as const;

const REGISTRATION_TYPE_OPTIONS = [
    { value: "REGULAR", label: "Regular" },
    { value: "UNREGISTERED", label: "Unregistered" },
] as const;

const MSME_SIZE_OPTIONS = [
    { value: "Micro", label: "Micro" },
    { value: "Small", label: "Small" },
    { value: "Medium", label: "Medium" },
] as const;

const MAJOR_ACTIVITY_OPTIONS = ["Manufacturing", "Services", "Trading", "Services (Trading)"] as const;

type VendorOrgFieldsProps<TFieldValues extends FieldValues> = {
    control: Control<TFieldValues>;
    prefix?: "" | "organization.";
};

export function VendorOrgFields<TFieldValues extends FieldValues>({ control, prefix = "" }: VendorOrgFieldsProps<TFieldValues>) {
    const name = (key: string) => `${prefix}${key}` as FieldPath<TFieldValues>;
    const { setValue } = useFormContext<TFieldValues>();
    const watchedMsme = useWatch({ control, name: name("msme") }) as unknown as string | undefined;
    const watchedMsmeSize = useWatch({ control, name: name("msmeSize") }) as unknown as string | undefined;
    const watchedMsmeType = useWatch({ control, name: name("msmeType") }) as unknown as string | undefined;
    const watchedMajorActivity = useWatch({ control, name: name("majorActivity") }) as unknown as string | undefined;

    // Only a real MSME number toggles these fields; placeholders like "NA" or
    // "unknown" do not. Existing values stay visible so legacy data remains editable.
    const hasRealMsme = isRealMsmeNumber(watchedMsme);
    const showMsmeSize = hasRealMsme || Boolean(watchedMsmeSize?.trim());
    const showMsmeType = hasRealMsme || Boolean(watchedMsmeType?.trim());
    const showMajorActivity = hasRealMsme || Boolean(watchedMajorActivity?.trim());

    const msmeTypePath = name("msmeType");
    const msmeSizePath = name("msmeSize");
    const majorActivityPath = name("majorActivity");

    const handleMsmeChange = (next: string) => {
        // Dropping the number (or replacing it with a placeholder) also drops the
        // dependent fields, so no stale values linger behind a non-real MSME field.
        if (isRealMsmeNumber(next)) return;
        setValue(msmeTypePath, undefined as never, { shouldDirty: true, shouldValidate: true });
        setValue(msmeSizePath, undefined as never, { shouldDirty: true, shouldValidate: true });
        setValue(majorActivityPath, undefined as never, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FieldWrapper control={control} name={name("name")} label="Organization Name *">
                    {field => (
                        <Input
                            placeholder="Enter organization name"
                            name={field.name}
                            value={String(field.value ?? "")}
                            onChange={field.onChange}
                            onBlur={() => {
                                field.onChange(formatVendorName(String(field.value ?? "")));
                                field.onBlur();
                            }}
                        />
                    )}
                </FieldWrapper>

                <SelectField
                    control={control}
                    name={name("category")}
                    label="Category"
                    options={CATEGORY_OPTIONS.map(value => ({ value, label: value }))}
                    placeholder="Select category"
                    valueType="string"
                />

                <SelectField
                    control={control}
                    name={name("registrationType")}
                    label="Registration Type"
                    options={REGISTRATION_TYPE_OPTIONS.map(option => ({ ...option }))}
                    placeholder="Select registration type"
                    valueType="string"
                />

                <FieldWrapper control={control} name={name("pan")} label="PAN">
                    {field => (
                        <Input
                            placeholder="ABCDE1234F"
                            name={field.name}
                            value={String(field.value ?? "")}
                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                            onBlur={field.onBlur}
                        />
                    )}
                </FieldWrapper>

                <FieldWrapper control={control} name={name("msme")} label="MSME Number">
                    {field => (
                        <Input
                            placeholder="UDYAM-XX-00-0000000"
                            name={field.name}
                            value={String(field.value ?? "")}
                            onChange={e => {
                                handleMsmeChange(e.target.value);
                                field.onChange(e.target.value.toUpperCase());
                            }}
                            onBlur={field.onBlur}
                        />
                    )}
                </FieldWrapper>

                {showMsmeSize && (
                    <SelectField
                        control={control}
                        name={name("msmeSize")}
                        label="MSME Size"
                        options={MSME_SIZE_OPTIONS.map(option => ({ ...option }))}
                        placeholder="Select size"
                        valueType="string"
                    />
                )}

                {showMsmeType && (
                    <SelectField
                        control={control}
                        name={msmeTypePath}
                        label="Supply Type *"
                        options={MSME_TYPE_OPTIONS.map(option => ({ ...option }))}
                        placeholder="Select type"
                        valueType="string"
                    />
                )}

                {showMajorActivity && (
                    <SelectField
                        control={control}
                        name={name("majorActivity")}
                        label="Major Activity"
                        options={MAJOR_ACTIVITY_OPTIONS.map(value => ({ value, label: value }))}
                        placeholder="Select activity"
                        valueType="string"
                    />
                )}

                <FieldWrapper control={control} name={name("creditPeriodDays")} label="Credit Period (days)">
                    {field => (
                        <NumberInput
                            min={0}
                            placeholder="e.g. 30"
                            value={field.value as number | null | undefined}
                            onChange={value => field.onChange(value ?? undefined)}
                            onBlur={field.onBlur}
                        />
                    )}
                </FieldWrapper>

                <FieldWrapper control={control} name={name("creditAmount")} label="Credit Amount (INR)">
                    {field => (
                        <NumberInput
                            min={0}
                            step="0.01"
                            placeholder="e.g. 1500000"
                            value={field.value as number | null | undefined}
                            onChange={value => field.onChange(value ?? undefined)}
                            onBlur={field.onBlur}
                        />
                    )}
                </FieldWrapper>
            </div>

            <FieldWrapper control={control} name={name("address")} label="Address">
                {field => (
                    <Textarea
                        placeholder="Enter organization address"
                        rows={3}
                        name={field.name}
                        value={String(field.value ?? "")}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                    />
                )}
            </FieldWrapper>

            <FormField
                control={control}
                name={name("status")}
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                            <Checkbox checked={Boolean(field.value)} onCheckedChange={checked => field.onChange(checked === true)} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                        </div>
                    </FormItem>
                )}
            />
        </>
    );
}
