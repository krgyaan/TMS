import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useCreateFollowup } from "@/hooks/api/useFollowups";
import type { MailFollowupRequest } from "../helpers/followup.types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const MailSchema = z.object({
    body: z.string().min(1, { message: "Mail body is required" }),
    frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
    nextFollowupDate: z.string().optional().nullable(),
});

type MailFormValues = z.infer<typeof MailSchema>;

const FREQUENCY_OPTIONS = [
    { value: 'daily',   label: 'Daily'   },
    { value: 'weekly',  label: 'Weekly'  },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom',  label: 'Custom'  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MailTabProps {
    leadId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MailTab({ leadId }: MailTabProps) {
    const createFollowup = useCreateFollowup(leadId);
    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]); // ✅ Store paths only

    const form = useForm<MailFormValues>({
        resolver: zodResolver(MailSchema),
        defaultValues: {
            body: "",
            frequency: "daily",
            nextFollowupDate: "",
        },
    });

    const handleSubmit = async (values: MailFormValues) => {
        const payload: MailFollowupRequest = {
            type: 'mail',
            body: values.body,
            frequency: values.frequency,
            attachments: attachmentPaths, // ✅ Use paths directly
            nextFollowupDate: values.nextFollowupDate || null,
        };
        try {
            await createFollowup.mutateAsync(payload);
            form.reset();
            setAttachmentPaths([]); // ✅ Clear attachments
        } catch {
            // handled by hook
        }
    };

    const saving = createFollowup.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                {/* Mail Body */}
                <FieldWrapper<MailFormValues, "body">
                    control={form.control}
                    name="body"
                    label="Mail Body"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[200px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Dear Sir/Madam,&#10;&#10;Write your mail body here..."
                            disabled={saving}
                            {...field}
                        />
                    )}
                </FieldWrapper>

                {/* Frequency */}
                <div className="w-64">
                    <SelectField<MailFormValues, "frequency">
                        control={form.control}
                        name="frequency"
                        label="Frequency"
                        options={FREQUENCY_OPTIONS}
                        placeholder="Select Frequency"
                    />
                </div>

                {/* Attachments - ✅ REPLACED */}
                <div className="space-y-2">
                    <TenderFileUploader
                        context="followups"
                        value={attachmentPaths}
                        onChange={setAttachmentPaths}
                        label="Attachments"
                        disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                        Upload relevant documents (optional)
                    </p>
                </div>

                {/* Next Follow-up Date */}
                <div className="w-64">
                    <FieldWrapper<MailFormValues, "nextFollowupDate">
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
                                <Send className="mr-2 h-4 w-4" />
                                Save Mail Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}