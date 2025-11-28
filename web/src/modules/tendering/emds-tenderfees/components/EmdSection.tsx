import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { NumberInput } from "@/components/form/NumberInput";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUploadField } from "@/components/form/FileUploadField";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "react-hook-form";
import { DELIVERY_OPTIONS, PURPOSE_OPTIONS, BG_PURPOSE_OPTIONS, BANKS, EMD_MODES } from "../constants";
import { Input } from "@/components/ui/input";

export function EmdSection({ allowedModes }: { allowedModes: string[] }) {
    const { control, watch, setValue } = useFormContext();
    const emdMode = watch("emdMode");

    return (
        <div className="border rounded-lg p-6 bg-muted/20">
            <FieldWrapper control={control} name="emdMode" label="Choose EMD Mode">
                {() => (
                    <RadioGroup onValueChange={(v) => setValue("emdMode", v)} className="flex flex-wrap gap-16">
                        {(Array.isArray(allowedModes) ? allowedModes : []).length === 0 ? (
                            <div className="text-muted-foreground text-sm italic px-2 py-1">No EMD modes available</div>
                        ) : (
                            (allowedModes || []).map((mode: string) => (
                                <div key={mode} className="flex items-center space-x-3">
                                    <RadioGroupItem value={mode} id={`emd-${mode}`} />
                                    <Label htmlFor={`emd-${mode}`} className="cursor-pointer">
                                        {EMD_MODES.find(m => m.value === mode)?.label || mode}
                                    </Label>
                                </div>
                            ))
                        )}
                    </RadioGroup>
                )}
            </FieldWrapper>

            {emdMode && (
                <div className="mt-6 pl-6 border-l-4 border-primary">

                    {/* DD */}
                    {emdMode === "1" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name="emd.ddFavouring" label="DD in Favour of*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.ddPayableAt" label="Payable At*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <SelectField control={control} name="emd.ddDeliverBy" label="DD deliver by*" options={DELIVERY_OPTIONS} placeholder="Select Deliver By" />
                            <SelectField control={control} name="emd.ddPurpose" label="Purpose of the DD*" options={PURPOSE_OPTIONS} placeholder="Select Purpose" />
                            <FieldWrapper control={control} name="emd.ddCourierAddress" label="Courier Address">
                                {(field) => <Textarea {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.ddCourierHours" label="Time required for courier (Hours)">
                                {(field) => <NumberInput {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.ddDate" label="DD Date">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.ddRemarks" label="Remarks (if any)">
                                {(field) => <Textarea {...field} />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* FDR */}
                    {emdMode === "2" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name="emd.fdrFavouring" label="FDR in Favour of*">
                                {(field) => <Input {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.fdrExpiryDate" label="FDR Expiry Date*">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                            <SelectField control={control} name="emd.fdrDeliverBy" label="FDR deliver by*" options={DELIVERY_OPTIONS} placeholder="Select Deliver By" />
                            <SelectField control={control} name="emd.fdrPurpose" label="Purpose of FDR*" options={PURPOSE_OPTIONS} placeholder="Select Purpose" />
                            <FieldWrapper control={control} name="emd.fdrCourierAddress" label="Courier Address">
                                {(field) => <Textarea {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.fdrCourierHours" label="Time required (Hours)">
                                {(field) => <NumberInput {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.fdrDate" label="FDR Date">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* BG */}
                    {emdMode === "4" && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SelectField control={control} name="emd.bgNeededIn" label="BG needed in*" options={[
                                    { value: "72", label: "72 Hours" },
                                    { value: "48", label: "48 Hours" },
                                    { value: "96", label: "96 Hours" },
                                    { value: "120", label: "120 Hours" },
                                ]} placeholder="Select Needed In" />
                                <SelectField control={control} name="emd.bgPurpose" label="Purpose of the BG*" options={BG_PURPOSE_OPTIONS} placeholder="Select Purpose" />
                                <FieldWrapper control={control} name="emd.bgFavouring" label="BG in Favour of*">
                                    {(field) => <Input {...field} required />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgAddress" label="BG Address*">
                                    {(field) => <Textarea {...field} required />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgExpiryDate" label="BG Expiry Date*">
                                    {(field) => <DatePicker {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgClaimPeriod" label="BG Claim Period*">
                                    {(field) => <DatePicker {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgStampValue" label="BG Stamp Paper Value">
                                    {(field) => <NumberInput {...field} />}
                                </FieldWrapper>
                                <FileUploadField control={control} name="emd.bgFormatFiles" label="Upload BG Format TE* (max 5)" multiple maxFiles={5} />
                                <FileUploadField control={control} name="emd.bgPoFiles" label="PO/Tender/Request letter Upload*" />
                                <FieldWrapper control={control} name="emd.bgCourierAddress" label="BG Courier Address*">
                                    {(field) => <Textarea {...field} required />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgCourierDays" label="Courier Delivery Time (Days)">
                                    {(field) => <NumberInput min={1} max={10} {...field} />}
                                </FieldWrapper>
                                <SelectField control={control} name="emd.bgBank" label="Bank*" options={BANKS} placeholder="Select Bank" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={control} name="emd.bgClientUserEmail" label="User Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgClientCpEmail" label="C&P Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.bgClientFinanceEmail" label="Finance Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                            </div>
                        </>
                    )}

                    {/* Bank Transfer */}
                    {emdMode === "5" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SelectField control={control} name="emd.btPurpose" label="Purpose*" options={PURPOSE_OPTIONS} placeholder="Select Purpose" />
                            <FieldWrapper control={control} name="emd.btAccountName" label="Account Name*">
                                {(field) => <input className="input" {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.btAccountNo" label="Account Number*">
                                {(field) => <input className="input" {...field} required />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.btIfsc" label="IFSC*">
                                {(field) => <input className="input" {...field} required />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Portal */}
                    {emdMode === "6" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SelectField control={control} name="emd.portalPurpose" label="Purpose*" options={PURPOSE_OPTIONS} placeholder="Select Purpose" />
                            <FieldWrapper control={control} name="emd.portalName" label="Name of Portal/Website*">
                                {(field) => <input className="input" {...field} required />}
                            </FieldWrapper>
                            <SelectField control={control} name="emd.portalNetBanking" label="Net Banking Available*" options={[
                                { value: "YES", label: "Yes" },
                                { value: "NO", label: "No" },
                            ]} placeholder="Select Net Banking Available" />
                            <SelectField control={control} name="emd.portalDebitCard" label="Yes Bank Debit Card Allowed*" options={[
                                { value: "YES", label: "Yes" },
                                { value: "NO", label: "No" },
                            ]} placeholder="Select Yes Bank Debit Card Allowed" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


/*
DD Details Fields:
- DD in Favour of*
- DD Amount* (pre-filled with EMD amount)
- Payable At*
- DD deliver by (dropdown: Select, Tender Due Date, 24/48/72/96 Hours)
- Purpose of the DD* (dropdown: EMD, Tender Fees, Security Deposit, Other Payment, Other Security)
- Courier Address
- Time required for courier to reach destination (Hours)
- DD Date (date picker)
- Remarks (if any)

FDR Details Fields:
- FDR in Favour of*
- FDR Amount*
- FDR Expiry Date*
- FDR deliver by* (dropdown: Tender Due Date, 24/48/72/96 Hours)
- Purpose of FDR* (dropdown: EMD, Tender Fees, Security Deposit, Other Payment, Other Security)
- Courier Address
- Time required for courier to reach destination (Hours)
- FDR Date (date picker)

Bank Guarantee Details Fields:
- BG needed in* (dropdown: 72/96/120 Hours)
- Purpose of the BG* (dropdown: Advance Payment, Security Bond/Deposit, Bid Bond, Performance, Financial, Counter Guarantee)
- BG in Favour of*
- BG Address*
- BG Expiry Date*
- BG Claim Period*
- BG Amount*
- BG Stamp Paper Value*
- Upload BG Format TE* (file upload, max 5 files)
- PO/Tender/Request letter Upload* (file upload, 1 file)
- Client Emails:
  - User Dept. Email
  - C&P Dept. Email
  - Finance Dept. Email
- Client Bank Details:
  - Bank Account Name
  - Account Number
  - IFSC
- BG Courier Address*
- Courier Delivery Time (dropdown: 1-10 days)
- Bank (dropdown: SBI, HDFC, ICICI, Yes Bank 2011, Yes Bank 0771, BG Limit, PNB)

Bank Transfer Details Fields:
- Purpose* (dropdown: EMD, Tender Fees, Others)
- Account Name*
- Account Number*
- IFSC*
- Amount* (pre-filled with EMD amount)

Payment on Portal Details Fields:
- Purpose* (dropdown: EMD, Tender Fees, Others)
- Name of Portal/Website*
- Net Banking Available* (dropdown: Yes/No)
- Yes Bank Debit Card Allowed* (dropdown: Yes/No)
- Amount* (pre-filled with EMD amount)
*/
