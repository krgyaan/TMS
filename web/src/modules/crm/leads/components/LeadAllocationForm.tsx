import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { SelectField } from "@/components/form/SelectField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useAllocateLead, useLead } from "@/hooks/api/useLeads";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import axiosInstance from "@/lib/axios";

// ─── Schema ───────────────────────────────────────────────────────────────────

const AllocationSchema = z.object({
    te_id: z.string().min(1, { message: "Please select a Technical Executive" }),
    allocation_notes: z.string().max(2000).optional(),
});

type AllocationFormValues = z.infer<typeof AllocationSchema>;

// ─── API Fetchers ─────────────────────────────────────────────────────────────

interface TEOption {
    value: string;
    label: string;
}

const fetchTechnicalExecutives = async (): Promise<TEOption[]> => {
    // Adjust the endpoint to whatever your backend exposes for TE users
    const res = await axiosInstance.get('/users?role=te');
    return res.data.map((u: { id: number; name: string; teamName?: string }) => ({
        value: u.id.toString(),
        label: u.teamName ? `${u.name} (${u.teamName})` : u.name,
    }));
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadAllocationFormProps {
    leadId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadAllocationForm({ leadId }: LeadAllocationFormProps) {
    const navigate = useNavigate();
    const allocateLead = useAllocateLead();

    // Fetch the lead so we can show company name in the header
    const { data: lead, isLoading: leadLoading } = useLead(leadId);

    // Fetch list of TEs for the dropdown
    const { data: teOptions = [], isLoading: teLoading } = useQuery({
        queryKey: ['technical-executives'],
        queryFn: fetchTechnicalExecutives,
    });

    const form = useForm<AllocationFormValues>({
        resolver: zodResolver(AllocationSchema),
        defaultValues: {
            te_id: lead?.allocatedTe?.toString() ?? "",
            allocation_notes: lead?.allocationNotes ?? "",
        },
    });

    const handleSubmit: SubmitHandler<AllocationFormValues> = async (values) => {
        try {
            await allocateLead.mutateAsync({
                id: leadId,
                data: {
                    allocatedTe: Number(values.te_id),
                    allocationNotes: values.allocation_notes || null,
                },
            });
            navigate(paths.crm.leads);
        } catch {
            // error handled by hook via toast
        }
    };

    if (leadLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!lead) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Lead not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const saving = allocateLead.isPending;

    return (
        <Card>  {/* ← REMOVED max-w-2xl mx-auto */}
            <CardHeader>
                <div className="flex flex-col gap-1">
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Allocate to Technical Executive
                    </CardTitle>
                    <CardDescription>
                        Allocating lead:{" "}
                        <span className="font-semibold text-foreground">
                            {lead.companyName || "—"}
                        </span>
                    </CardDescription>
                </div>
                <CardAction>
                    <Button
                        variant="outline"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Return Back
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
                    >
                        {/* ── Form fields in a grid layout (like LeadForm) ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ── TE Selector ─────────────────────────────── */}
                            <SelectField<AllocationFormValues, "te_id">
                                control={form.control}
                                name="te_id"
                                label="Select Technical Executive"
                                options={teOptions}
                                placeholder={
                                    teLoading
                                        ? "Loading executives..."
                                        : "-- Select TE --"
                                }
                                disabled={teLoading}
                            />

                            {/* ── Notes (full width on second row) ────────── */}
                            <div className="col-span-full">
                                <FieldWrapper<AllocationFormValues, "allocation_notes">
                                    control={form.control}
                                    name="allocation_notes"
                                    label="Allocation Notes"
                                >
                                    {(field) => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter any notes about this allocation..."
                                            maxLength={2000}
                                            disabled={saving}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* ── Actions ─────────────────────────────────── */}
                        <div className="w-full flex items-center justify-center gap-2 pt-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Allocating...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Allocate TE
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.crm.leads)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}