import { paths } from "@/app/routes/paths";
import { FileUploader } from "@/components/file-upload";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchaseInvoiceDetails, useUpdatePurchaseInvoice } from "@/hooks/api/usePurchaseInvoices";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar, Hash, Info, Link2, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { mapPurchaseInvoiceFormToUpdateDTO } from "./helpers/purchaseInvoice.mapper";
import { purchaseInvoiceFormSchema, type PurchaseInvoiceFormValues } from "./helpers/purchaseInvoice.schema";

const BUDGET_CATEGORIES = [
    { id: "Supply", name: "Supply" },
    { id: "Service", name: "Service" },
    { id: "Freight", name: "Freight" },
    { id: "Admin/Misc.", name: "Admin/Misc." },
    { id: "Buyback/Sale", name: "Buyback/Sale" },
    { id: "GEM Charges", name: "GEM Charges" },
];

export default function EditPurchaseInvoicePage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam, piId: piIdParam } = useParams<{ projectId: string; piId: string }>();
    const projectId = Number(projectIdParam);
    const piId = Number(piIdParam);
    const { data: invoice, isLoading } = usePurchaseInvoiceDetails(piId);
    const updateMutation = useUpdatePurchaseInvoice();

    const form = useForm<PurchaseInvoiceFormValues>({
        resolver: zodResolver(purchaseInvoiceFormSchema) as any,
        defaultValues: {
            invoiceNo: "",
            category: "",
            partyName: "",
            valuePreGst: null,
            gstAmount: null,
            invoiceDate: "",
            invoiceFile: [],
            selectedPoId: "",
            selectedVwoId: "",
            items: [],
            extraCharges: [],
        },
    });

    useEffect(() => {
        if (invoice) {
            form.reset({
                invoiceNo: invoice.invoiceNo || "",
                category: invoice.category || "",
                partyName: invoice.partyName || "",
                valuePreGst: Number(invoice.valuePreGst) || null,
                gstAmount: Number(invoice.gstAmount) || null,
                invoiceDate: invoice.invoiceDate || "",
                invoiceFile: invoice.invoiceFile ? [invoice.invoiceFile] : [],
                selectedPoId: invoice.purchaseOrderId ? String(invoice.purchaseOrderId) : "",
                selectedVwoId: invoice.vendorWorkOrderId ? String(invoice.vendorWorkOrderId) : "",
                items: [],
                extraCharges: [],
            });
        }
    }, [invoice, form]);

    const handleSubmit = async (values: PurchaseInvoiceFormValues) => {
        try {
            const data = mapPurchaseInvoiceFormToUpdateDTO(values);
            await updateMutation.mutateAsync({ id: piId, data });
            toast.success("Purchase Invoice updated successfully.");
            navigate(paths.operations.projectDashboard(projectId));
        } catch (err) {
            const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(typeof apiMessage === "string" ? apiMessage : "Failed to update purchase invoice.");
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 max-w-4xl">
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    const linkedRef = invoice?.purchaseOrderId && invoice.poNumber ? `PO ${invoice.poNumber}` : invoice?.vendorWorkOrderId && invoice.woNumber ? `VWO ${invoice.woNumber}` : "";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Edit Purchase Invoice</CardTitle>
                        <CardDescription className="mt-2">
                            <Badge variant="secondary">{invoice?.invoiceNo || ""}</Badge>
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" size="sm" type="button" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper
                                control={form.control}
                                name="invoiceNo"
                                label={
                                    <>
                                        <Hash className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                        Invoice Number <span className="text-destructive">*</span>
                                    </>
                                }
                            >
                                {field => <Input {...field} placeholder="Enter invoice number" />}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="invoiceDate"
                                label={
                                    <>
                                        <Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                        Invoice Date <span className="text-destructive">*</span>
                                    </>
                                }
                            >
                                {field => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

                        {linkedRef && (
                            <div className="rounded-lg border border-dashed p-4 flex items-center gap-2 text-sm">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Linked to</span>
                                <Badge variant="secondary">{linkedRef}</Badge>
                                <span className="text-xs text-muted-foreground ml-auto">The linked order cannot be changed.</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper
                                control={form.control}
                                name="partyName"
                                label={
                                    <>
                                        Party Name <span className="text-destructive">*</span>
                                    </>
                                }
                            >
                                {field => <Input {...field} placeholder="Enter party name" />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="category"
                                label={
                                    <>
                                        <Info className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                        Category <span className="text-destructive">*</span>
                                    </>
                                }
                                options={BUDGET_CATEGORIES}
                                placeholder="Select category..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper
                                control={form.control}
                                name="valuePreGst"
                                label={
                                    <>
                                        Value (Pre GST) <span className="text-destructive">*</span>
                                    </>
                                }
                            >
                                {field => <NumberInput value={field.value} onChange={field.onChange} min={0} step={0.01} placeholder="0.00" className="h-9 text-right" />}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="gstAmount"
                                label={
                                    <>
                                        GST Amount <span className="text-destructive">*</span>
                                    </>
                                }
                            >
                                {field => <NumberInput value={field.value} onChange={field.onChange} min={0} step={0.01} placeholder="0.00" className="h-9 text-right" />}
                            </FieldWrapper>
                        </div>

                        <div>
                            <FileUploader
                                label="Upload Invoice"
                                context="tender-documents"
                                value={form.watch("invoiceFile")}
                                onChange={paths => form.setValue("invoiceFile", paths)}
                            />
                        </div>

                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-[160px]" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Invoice"
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
