import { type Control, type FieldPath, type FieldValues, useFormContext, useWatch } from "react-hook-form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatVendorName } from "@/lib/vendorName";

const MSME_TYPE_OPTIONS = [
    { value: "M", label: "Manufacturer" },
    { value: "S", label: "Service" },
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
    const hasMsme = Boolean(watchedMsme?.trim());
    const msmeTypePath = name("msmeType");

    const handleMsmeChange = (next: string) => {
        const value = next.toUpperCase();
        // Dropping the number also drops the type, so no stale type lingers behind an empty MSME field.
        if (!value) setValue(msmeTypePath, undefined as never, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FieldWrapper control={control} name={name("name")} label="Organization Name *">
                    {field => (
                        <Input
                            placeholder="Enter organization name"
                            {...(field as any)}
                            value={String(field.value ?? "")}
                            onBlur={() => {
                                field.onChange(formatVendorName(String(field.value ?? "")));
                                field.onBlur();
                            }}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("category")} label="Category">
                    {field => (
                        <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                            <SelectTrigger aria-label="Category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_OPTIONS.map(option => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("registrationType")} label="Registration Type">
                    {field => (
                        <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                            <SelectTrigger aria-label="Registration Type">
                                <SelectValue placeholder="Select registration type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REGISTRATION_TYPE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("pan")} label="PAN">
                    {field => (
                        <Input
                            placeholder="ABCDE1234F"
                            {...(field as any)}
                            value={String(field.value ?? "")}
                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("msme")} label="MSME Number">
                    {field => (
                        <Input
                            placeholder="UDYAM-XX-00-0000000"
                            {...(field as any)}
                            value={String(field.value ?? "")}
                            onChange={e => {
                                handleMsmeChange(e.target.value);
                                field.onChange(e.target.value.toUpperCase());
                            }}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("msmeSize")} label="MSME Size">
                    {field => (
                        <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                            <SelectTrigger aria-label="MSME Size">
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                {MSME_SIZE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </FieldWrapper>
                {hasMsme && (
                    <FieldWrapper control={control} name={msmeTypePath} label="Supply Type *">
                        {field => (
                            <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                                <SelectTrigger aria-label="Supply Type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MSME_TYPE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </FieldWrapper>
                )}
                <FieldWrapper control={control} name={name("majorActivity")} label="Major Activity">
                    {field => (
                        <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                            <SelectTrigger aria-label="Major Activity">
                                <SelectValue placeholder="Select activity" />
                            </SelectTrigger>
                            <SelectContent>
                                {MAJOR_ACTIVITY_OPTIONS.map(option => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("creditPeriodDays")} label="Credit Period (days)">
                    {field => (
                        <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 30"
                            name={field.name}
                            value={String(field.value ?? "")}
                            onChange={e => field.onChange(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)}
                            onBlur={field.onBlur}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("creditAmount")} label="Credit Amount (INR)">
                    {field => (
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="e.g. 1500000"
                            name={field.name}
                            value={String(field.value ?? "")}
                            onChange={e => field.onChange(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)}
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
                        {...(field as any)}
                        value={String(field.value ?? "")}
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
