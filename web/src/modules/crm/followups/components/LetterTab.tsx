import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload"; // ✅ Changed
import { useCreateFollowup } from "@/hooks/api/useFollowups";
import { useUsers } from "@/hooks/api/useUsers";
import type { LetterFollowupRequest } from "../helpers/followup.types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const LetterSchema = z.object({
    toOrg:           z.string().min(1, { message: "Organization name is required" }),
    toName:          z.string().min(1, { message: "Recipient name is required" }),
    toAddr:          z.string().min(1, { message: "Address is required" }),
    toPin:           z.string().min(1, { message: "Pin code is required" }),
    toMobile:        z.string().min(1, { message: "Mobile number is required" }),
    empFrom:         z.string().min(1, { message: "Please select an employee" }),
    delDate:         z.string().min(1, { message: "Expected delivery date is required" }),
    urgency:         z.string().min(1, { message: "Please select urgency" }),
    nextFollowupDate: z.string().optional().nullable(),
});

type LetterFormValues = z.infer<typeof LetterSchema>;

const URGENCY_OPTIONS = [
    { value: '1', label: 'Very Low' },
    { value: '2', label: 'Low'      },
    { value: '3', label: 'Normal'   },
    { value: '4', label: 'High'     },
    { value: '5', label: 'Urgent'   },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LetterTabProps {
    leadId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LetterTab({ leadId }: LetterTabProps) {
    const createFollowup = useCreateFollowup(leadId);
    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]); // ✅ Changed
    const { data: allUsers = [] } = useUsers();

    const employeeOptions = allUsers.map(u => ({
        value: u.id.toString(),
        label: u.team?.name ? `${u.name} (${u.team.name})` : (u.name ?? ""),
    }));

    const form = useForm<LetterFormValues>({
        resolver: zodResolver(LetterSchema),
        defaultValues: {
            toOrg:            "",
            toName:           "",
            toAddr:           "",
            toPin:            "",
            toMobile:         "",
            empFrom:          "",
            delDate:          "",
            urgency:          "",
            nextFollowupDate: "",
        },
    });

    const handleSubmit = async (values: LetterFormValues) => {
        const payload: LetterFollowupRequest = {
            type:             'letter',
            toOrg:            values.toOrg,
            toName:           values.toName,
            toAddr:           values.toAddr,
            toPin:            values.toPin,
            toMobile:         values.toMobile,
            empFrom:          Number(values.empFrom),
            delDate:          values.delDate,
            urgency:          Number(values.urgency),
            attachments:      attachmentPaths, // ✅ Changed
            nextFollowupDate: values.nextFollowupDate || null,
        };
        try {
            await createFollowup.mutateAsync(payload);
            form.reset();
            setAttachmentPaths([]); // ✅ Changed
        } catch {
            // handled by hook
        }
    };

    const saving = createFollowup.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Organization Name */}
                    <FieldWrapper<LetterFormValues, "toOrg">
                        control={form.control}
                        name="toOrg"
                        label="Organization Name"
                    >
                        {(field) => (
                            <Input
                                placeholder="Enter organization name"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    {/* Recipient Name */}
                    <FieldWrapper<LetterFormValues, "toName">
                        control={form.control}
                        name="toName"
                        label="Name"
                    >
                        {(field) => (
                            <Input
                                placeholder="Enter recipient name"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    {/* Address */}
                    <div className="col-span-full">
                        <FieldWrapper<LetterFormValues, "toAddr">
                            control={form.control}
                            name="toAddr"
                            label="Address"
                        >
                            {(field) => (
                                <textarea
                                    className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="Enter full address"
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* Pin Code */}
                    <FieldWrapper<LetterFormValues, "toPin">
                        control={form.control}
                        name="toPin"
                        label="Pin Code"
                    >
                        {(field) => (
                            <Input
                                placeholder="Enter pin code"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    {/* Mobile Number */}
                    <FieldWrapper<LetterFormValues, "toMobile">
                        control={form.control}
                        name="toMobile"
                        label="Mobile Number"
                    >
                        {(field) => (
                            <Input
                                type="tel"
                                placeholder="Enter mobile number"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    {/* Courier From */}
                    <SelectField<LetterFormValues, "empFrom">
                        control={form.control}
                        name="empFrom"
                        label="Courier From"
                        options={employeeOptions}
                        placeholder="Select Employee"
                    />

                    {/* Expected Delivery Date */}
                    <FieldWrapper<LetterFormValues, "delDate">
                        control={form.control}
                        name="delDate"
                        label="Expected Delivery Date"
                    >
                        {(field) => (
                            <input
                                type="date"
                                className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    {/* Dispatch Urgency */}
                    <SelectField<LetterFormValues, "urgency">
                        control={form.control}
                        name="urgency"
                        label="Dispatch Urgency"
                        options={URGENCY_OPTIONS}
                        placeholder="Select Urgency"
                    />

                    {/* Next Follow-up Date */}
                    <FieldWrapper<LetterFormValues, "nextFollowupDate">
                        control={form.control}
                        name="nextFollowupDate"
                        label="Next Follow-up Date"
                    >
                        {(field) => (
                            <input
                                type="date"
                                className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                disabled={saving}
                                {...field}
                                value={field.value ?? ""}
                            />
                        )}
                    </FieldWrapper>

                    {/* Soft Copy Attachments - ✅ REPLACED */}
                    <div className="col-span-full space-y-2">
                        <TenderFileUploader
                            context="followups"
                            value={attachmentPaths}
                            onChange={setAttachmentPaths}
                            label="Soft Copy of Documents"
                            disabled={saving}
                        />
                    </div>

                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Save Letter Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}