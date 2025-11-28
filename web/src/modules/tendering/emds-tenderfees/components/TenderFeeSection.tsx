import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "react-hook-form";
import { DELIVERY_OPTIONS, PURPOSE_OPTIONS, TENDER_FEES_MODES } from "../constants";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/form/NumberInput";

interface TenderFeeSectionProps {
    prefix: "tenderFee" | "processingFee";
    title: string;
    allowedModes: string[];
}

export function TenderFeeSection({ prefix, title, allowedModes }: TenderFeeSectionProps) {
    const { control, watch, setValue } = useFormContext();
    const mode = watch(`${prefix}Mode`);

    return (
        <div className="border rounded-lg p-6 space-y-6">
            <FieldWrapper control={control} name={`${prefix}Mode`} label={`Choose ${title} Mode`}>
                {() => (
                    <RadioGroup onValueChange={(v) => setValue(`${prefix}Mode`, v)}>
                        {(Array.isArray(allowedModes) ? allowedModes : []).length === 0 ? (
                            <div className="text-muted-foreground text-sm italic px-2 py-1">No modes available</div>
                        ) : (
                            (allowedModes || []).map((mode: string) => (
                                <div key={mode} className="flex items-center space-x-3">
                                    <RadioGroupItem value={mode} id={`${prefix}-${mode}`} />
                                    <Label htmlFor={`${prefix}-${mode}`} className="cursor-pointer">
                                        {TENDER_FEES_MODES.find(m => m.value === mode)?.label || mode}
                                    </Label>
                                </div>
                            ))
                        )}
                    </RadioGroup>
                )}
            </FieldWrapper>

            {mode && (
                <div className="mt-6 pl-6">

                    {/* DD */}
                    {mode === "1" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name={`${prefix}.ddAmount`} label="Amount*">
                                {(field) => <NumberInput step={0.01} {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.ddFavouring`} label="DD in Favour of*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.ddPayableAt`} label="Payable At*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <SelectField control={control} name={`${prefix}.ddDeliverBy`} label="DD deliver by*" options={DELIVERY_OPTIONS} placeholder="Select Deliver By" />
                            <SelectField control={control} name={`${prefix}.ddPurpose`} label="Purpose of DD*" options={PURPOSE_OPTIONS} placeholder="Select Purpose" />
                            <FieldWrapper control={control} name={`${prefix}.ddCourierAddress`} label="Courier Address">
                                {(field) => <Textarea {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.ddCourierHours`} label="Time required for courier (Hours)">
                                {(field) => <Input type="number" {...field} />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Bank Transfer */}
                    {mode === "5" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name={`${prefix}.btAmount`} label="Amount*">
                                {(field) => <NumberInput step={0.01} {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.btAccountName`} label="Account Name*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.btAccountNo`} label="Account Number*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.btIfsc`} label="IFSC*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Portal */}
                    {mode === "6" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name={`${prefix}.portalAmount`} label="Amount*">
                                {(field) => <NumberInput step={0.01} {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name={`${prefix}.portalName`} label="Name of Portal/Website*">
                                {(field) => <Input placeholder="gem.gov.in" {...field} required />}
                            </FieldWrapper>
                            <SelectField control={control} name={`${prefix}.portalNetBanking`} label="Net Banking Available*" options={[
                                { value: "YES", label: "Yes" },
                                { value: "NO", label: "No" },
                            ]} placeholder="Select Net Banking Available" />
                            <SelectField control={control} name={`${prefix}.portalDebitCard`} label="Yes Bank Debit Card Allowed*" options={[
                                { value: "YES", label: "Yes" },
                                { value: "NO", label: "No" },
                            ]} placeholder="Select Net Banking Available" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/*
"Tender Fee Mode" section with 3 radio button options:
1. Payment on Portal
2. Bank Transfer
3. Demand Draft
Here are the fields for each Tender Fee payment option:
1. Tender Fees Details:
- Amount
- DD deliver by
- Purpose of DD
- DD in favour of
- DD Payable at
- Courier Address
- Time required for courier to reach destination
2. Tender Fee Bank Transfer Details:
- Amount
- Purpose
- Account Name
- Account Number
- IFSC
3. Tender Fee Payment on Portal Details:
- Amount
- Purpose
- Name of Portal/Website
- Net Banking Available
- Yes Bank Debit Card Allowed
*/
