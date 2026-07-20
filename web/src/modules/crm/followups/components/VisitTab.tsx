import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { ContactPersonFields } from "./ContactPersonFields";
import { useCreateFollowup } from "@/hooks/api/useFollowups";
import type { ContactPerson, VisitFollowupRequest } from "../helpers/followup.types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const VisitSchema = z.object({
    body: z.string().min(1, { message: "Points discussed is required" }),
    veResponsibility: z.string().optional().nullable(),
    nextFollowupDate: z.string().optional().nullable(),
});

type VisitFormValues = z.infer<typeof VisitSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisitTabProps {
    leadId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisitTab({ leadId }: VisitTabProps) {
    const createFollowup = useCreateFollowup(leadId);
    const [contacts, setContacts] = useState<ContactPerson[]>([]);

    const form = useForm<VisitFormValues>({
        resolver: zodResolver(VisitSchema),
        defaultValues: {
            body: "",
            veResponsibility: "",
            nextFollowupDate: "",
        },
    });

    const handleSubmit = async (values: VisitFormValues) => {
        const payload: VisitFollowupRequest = {
            type: 'visit',
            body: values.body,
            veResponsibility: values.veResponsibility || null,
            contacts,
            nextFollowupDate: values.nextFollowupDate || null,
        };
        try {
            await createFollowup.mutateAsync(payload);
            form.reset();
            setContacts([]);
        } catch {
            // handled by hook
        }
    };

    const saving = createFollowup.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                {/* Points Discussed */}
                <FieldWrapper<VisitFormValues, "body">
                    control={form.control}
                    name="body"
                    label="Points Discussed"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Enter points discussed during the visit..."
                            disabled={saving}
                            {...field}
                        />
                    )}
                </FieldWrapper>

                {/* VE Responsibility */}
                <FieldWrapper<VisitFormValues, "veResponsibility">
                    control={form.control}
                    name="veResponsibility"
                    label="VE Responsibility"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Enter VE responsibilities..."
                            disabled={saving}
                            {...field}
                            value={field.value ?? ""}
                        />
                    )}
                </FieldWrapper>

                {/* Contact Persons */}
                <ContactPersonFields
                    contacts={contacts}
                    onChange={setContacts}
                    disabled={saving}
                />

                {/* Next Follow-up Date */}
                <div className="w-64">
                    <FieldWrapper<VisitFormValues, "nextFollowupDate">
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
                                <MapPin className="mr-2 h-4 w-4" />
                                Save Visit Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}