import { paths } from "@/app/routes/paths";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useCreatePaymentRequest, useNextPRNumber } from "@/hooks/api/usePaymentRequests";
import { PaymentAgainstField } from "./components/PaymentAgainstField";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Hash, Landmark, Loader2 } from "lucide-react";
import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { mapPaymentRequestFormToCreateDTO } from "./helpers/paymentRequest.mapper";
import { paymentRequestFormSchema, type PaymentRequestFormValues } from "./helpers/paymentRequest.schema";
import { usePoParties, useCreatePoParty } from "@/hooks/api/useProjectDashboard";

const defaultFormValues: PaymentRequestFormValues = {
    partyName: "",
    accountNumber: "",
    accountName: "",
    ifsc: "",
    amount: null,
    paymentAgainst: "",
    purchaseInvoiceId: "",
    uploadedInvoiceFile: [],
    poFile: [],
    remark: "",
};

export default function CreatePaymentRequestPage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const { data: partiesData } = usePoParties();
    const parties = partiesData || [];
    const projectName = overview?.project?.projectName;
    const { data: nextPRNumber, isLoading: isLoadingPRNumber } = useNextPRNumber(projectName);

    const form = useForm<PaymentRequestFormValues>({
        resolver: zodResolver(paymentRequestFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const partyOptions = useMemo(() =>
        (parties || [])
            .filter((p: any) => !p.type || p.type === "seller")
            .map((p: any) => ({ id: p.name, name: p.name })),
        [parties]
    );

    const createPRMutation = useCreatePaymentRequest();

    const handleSubmit = async (values: PaymentRequestFormValues) => {
        try {
            const prData = mapPaymentRequestFormToCreateDTO(values, projectId, projectName);
            const result = await createPRMutation.mutateAsync(prData);
            toast.success(`Payment Request #${result.requestNo} created successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
        } catch {
            toast.error("Failed to create payment request. Please try again.");
        }
    };

    if (isProjectLoading) {
        return (
            <div className="container mx-auto py-6 max-w-4xl">
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Raise Payment Request</CardTitle>
                        <CardDescription className="mt-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline">
                                    {overview?.tender?.tenderNumber || "N/A"}
                                </Badge>
                                <Badge variant="secondary">
                                    {overview?.project?.projectName || "N/A"}
                                </Badge>
                            </div>
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" size="sm" type="button" onClick={() => navigate(-1)} className="flex items-center space-x-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Go Back</span>
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Request Number Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    Request Number
                                </Label>
                                <Input value={isLoadingPRNumber ? "Loading..." : nextPRNumber} readOnly className="bg-muted font-mono" />
                                <p className="text-xs text-muted-foreground">Preview — final number assigned upon creation</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Project Name
                                </Label>
                                <Input value={overview?.project?.projectName || ""} readOnly className="bg-muted" />
                            </div>
                        </div>

                        {/* Party Name */}
                        <div className="max-w-md">
                            <SelectField
                                control={form.control}
                                name="partyName"
                                label="Party Name"
                                options={partyOptions}
                                placeholder="Select or type party name..."
                                allowCustom
                            />
                        </div>

                        {/* Bank Details */}
                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Landmark className="h-5 w-5" />
                                Bank Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FieldWrapper control={form.control} name="accountNumber" label="Account Number <span className='text-destructive'>*</span>">
                                    {(field) => <Input {...field} placeholder="Enter account number" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="accountName" label="Account Name <span className='text-destructive'>*</span>">
                                    {(field) => <Input {...field} placeholder="Enter account name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="ifsc" label="IFSC <span className='text-destructive'>*</span>">
                                    {(field) => (
                                        <Input
                                            {...field}
                                            placeholder="e.g. SBIN0001234"
                                            className="font-mono"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="amount" label="Amount <span className='text-destructive'>*</span>">
                                    {(field) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* Payment Against */}
                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <h3 className="text-lg font-semibold">Payment Details</h3>
                            <PaymentAgainstField control={form.control} />
                        </div>

                        {/* Footer */}
                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-[160px]" disabled={createPRMutation.isPending}>
                                    {createPRMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                    ) : (
                                        "Create Request"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
