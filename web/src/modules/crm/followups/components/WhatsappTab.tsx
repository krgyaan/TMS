import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { TenderFileUploader } from "@/components/tender-file-upload"; // ✅ Changed
import { useCreateFollowup } from "@/hooks/api/useFollowups";
import type { WhatsappFollowupRequest } from "../helpers/followup.types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const WhatsappSchema = z.object({
    body: z.string().min(1, { message: "Please enter what you sent" }),
    nextFollowupDate: z.string().optional().nullable(),
});

type WhatsappFormValues = z.infer<typeof WhatsappSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface WhatsappTabProps {
    leadId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsappTab({ leadId }: WhatsappTabProps) {
    const createFollowup = useCreateFollowup(leadId);
    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]); // ✅ Changed

    const form = useForm<WhatsappFormValues>({
        resolver: zodResolver(WhatsappSchema),
        defaultValues: {
            body: "",
            nextFollowupDate: "",
        },
    });

    const handleSubmit = async (values: WhatsappFormValues) => {
        const payload: WhatsappFollowupRequest = {
            type: 'whatsapp',
            body: values.body,
            attachments: attachmentPaths, // ✅ Changed
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

                {/* What was sent */}
                <FieldWrapper<WhatsappFormValues, "body">
                    control={form.control}
                    name="body"
                    label="What you have sent?"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Describe what you sent via WhatsApp..."
                            disabled={saving}
                            {...field}
                        />
                    )}
                </FieldWrapper>

                {/* Attachments - ✅ REPLACED */}
                <div className="space-y-2">
                    <TenderFileUploader
                        context="followups"
                        value={attachmentPaths}
                        onChange={setAttachmentPaths}
                        label="Attachments"
                        disabled={saving}
                    />
                </div>

                {/* Next Follow-up Date */}
                <div className="w-64">
                    <FieldWrapper<WhatsappFormValues, "nextFollowupDate">
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
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Save WhatsApp Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}