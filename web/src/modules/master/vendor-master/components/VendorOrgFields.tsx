import { type Control, type FieldPath, type FieldValues, useFormContext, useWatch } from "react-hook-form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MSME_TYPE_OPTIONS = [
    { value: "M", label: "Manufacturer" },
    { value: "S", label: "Service" },
] as const;

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
                    {field => <Input placeholder="Enter organization name" {...(field as any)} value={String(field.value ?? "")} />}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("alias")} label="Alias">
                    {field => <Input placeholder="e.g. Factory, HO" {...(field as any)} value={String(field.value ?? "")} />}
                </FieldWrapper>
                <FieldWrapper control={control} name={name("msme")} label="MSME">
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

                {hasMsme && (
                    <FieldWrapper control={control} name={msmeTypePath} label="MSME Type *">
                        {field => (
                            <Select value={String(field.value ?? "")} onValueChange={value => field.onChange(value)}>
                                <SelectTrigger aria-label="MSME Type">
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
