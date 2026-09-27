import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type VendorOrgFieldsProps<TFieldValues extends FieldValues> = {
    control: Control<TFieldValues>;
    prefix?: "" | "organization.";
};

export function VendorOrgFields<TFieldValues extends FieldValues>({ control, prefix = "" }: VendorOrgFieldsProps<TFieldValues>) {
    const name = (key: string) => `${prefix}${key}` as FieldPath<TFieldValues>;

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
                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                        />
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
