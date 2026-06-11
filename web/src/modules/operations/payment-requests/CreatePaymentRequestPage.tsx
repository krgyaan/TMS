import { paths } from "@/app/routes/paths";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatePaymentRequest, useNextPRNumber } from "@/hooks/api/usePaymentRequests";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { purchaseInvoiceApi } from "@/services/api/purchase-invoice.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Hash, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PaymentAgainstField } from "./components/PaymentAgainstField";
import { mapPaymentRequestFormToCreateDTO } from "./helpers/paymentRequest.mapper";
import { paymentRequestFormSchema, type PaymentRequestFormValues } from "./helpers/paymentRequest.schema";

const defaultFormValues: PaymentRequestFormValues = {
    partyName: "",
    accountNumber: "",
    accountName: "",
    ifsc: "",
    amount: null,
    paymentAgainst: "",
    uploadedInvoiceFile: [],
    poFile: [],
    remark: "",
    pi_category: "",
    pi_partyName: "",
    pi_valuePreGst: null,
    pi_gstAmount: null,
    pi_invoiceDate: "",
    pi_invoiceFile: [],
};

export default function CreatePaymentRequestPage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName;
    const { data: nextPRNumber, isLoading: isLoadingPRNumber } = useNextPRNumber(projectName);

    const form = useForm<PaymentRequestFormValues>({
        resolver: zodResolver(paymentRequestFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const createPRMutation = useCreatePaymentRequest();

    const handleSubmit = async (values: PaymentRequestFormValues) => {
        try {
            const prData = mapPaymentRequestFormToCreateDTO(values, projectId, projectName);

            if (values.paymentAgainst === "new_pi") {
                const pi = await purchaseInvoiceApi.create({
                    projectId,
                    projectName: projectName || undefined,
                    category: values.pi_category,
                    partyName: values.pi_partyName,
                    valuePreGst: values.pi_valuePreGst!,
                    gstAmount: values.pi_gstAmount!,
                    invoiceDate: values.pi_invoiceDate,
                    invoiceFile: values.pi_invoiceFile?.[0],
                });
                prData.purchaseInvoiceId = pi.id;
            }

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


                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper control={form.control} name="partyName" label={<>Party Name <span className="text-destructive">*</span></>}>
                                    {(field) => <Input {...field} placeholder="Enter party name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="accountNumber" label={<>Account Number <span className="text-destructive">*</span></>}>
                                    {(field) => <Input {...field} placeholder="Enter account number" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="accountName" label={<>Account Name <span className="text-destructive">*</span></>}>
                                    {(field) => <Input {...field} placeholder="Enter account name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="ifsc" label={<>IFSC <span className="text-destructive">*</span></>}>
                                    {(field) => (
                                        <Input
                                            {...field}
                                            placeholder="e.g. SBIN0001234"
                                            className="font-mono"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="amount" label={<>Amount <span className="text-destructive">*</span></>}>
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

                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <PaymentAgainstField control={form.control} />
                        </div>

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
