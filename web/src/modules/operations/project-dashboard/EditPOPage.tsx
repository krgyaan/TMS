import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { MultiSelectField } from "@/components/form/MultiSelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreatePoParty, usePoParties, usePurchaseOrderDetails, useUpdatePurchaseOrder } from "@/hooks/api/useProjectDashboard";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Building2, Calendar, FileText, Hash, Info, Loader2, Mail, MapPin, Phone, Save, UserCheck, UserPlus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProductsField } from "./components/ProductsField";
import { TermsField } from "./components/TermsField";
import { formatDateForInput, mapFormToUpdateDTO } from "./helpers/projectDashboard.mapper";
import type { CreatePartyDTO } from "./helpers/projectDashboard.types";
import { purchaseOrderFormSchema, type PurchaseOrderFormValues } from "./helpers/purchaseOrder.schema";

interface NewPartyForm {
    name: string;
    alias: string;
    email: string;
    address: string;
    gstNo: string;
    pan: string;
    msme: string;
}

const defaultFormValues: PurchaseOrderFormValues = {
    poType: "new",
    piAttachments: [],
    category: "",
    poDate: "",
    sellerId: "",
    sellerName: "",
    sellerEmail: "",
    sellerAddress: "",
    sellerGstNo: "",
    sellerPanNo: "",
    sellerMsmeNo: "",
    sellerCinNo: "",
    contactPersonName: "",
    contactPersonPhone: "",
    contactPersonEmail: "",
    partyId: "",
    selectedUserId: "",
    selectedCertRecipients: [],
    shipToName: "",
    shippingAddress: "",
    shipToGst: "",
    shipToPan: "",
    products: [],
    quotationNo: "",
    quotationDate: "",
    technicalSpecsAttachments: [],
    accessoriesPackagingListAttachments: [],
    termsAndConditions: [],
    remarks: "",
};

const FormSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                        <div key={j} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const NotFound = ({ message, onBack }: { message: string; onBack: () => void }) => (
    <div className="container mx-auto py-6 max-w-6xl">
        <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Not Found</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </CardContent>
        </Card>
    </div>
);

export default function EditPOPage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam, poId } = useParams<{ projectId: string; poId: string }>();
    const purchaseOrderId = Number(poId);

    const { data: poData, isLoading: isPOLoading, isError: isPOError, error: poError } = usePurchaseOrderDetails(purchaseOrderId);
    const projectId = Number(projectIdParam) || poData?.projectId;

    const { data: partiesData } = usePoParties();
    const updatePOMutation = useUpdatePurchaseOrder();
    const createPartyMutation = useCreatePoParty();

    const parties = partiesData || [];

    const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
    const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);
    const [partyCreationType, setPartyCreationType] = useState<"seller" | "ship_to">("seller");
    const [newParty, setNewParty] = useState<NewPartyForm>({ name: "", alias: "", email: "", address: "", gstNo: "", pan: "", msme: "" });

    const form = useForm<PurchaseOrderFormValues>({
        resolver: zodResolver(purchaseOrderFormSchema) as any,
        defaultValues: defaultFormValues,
    });
    const selectedSellerId = form.watch("sellerId");
    const selectedPartyId = form.watch("partyId");

    const { data: teamMembers = [] } = useGetTeamMembers(0); // all active team members across teams
    const selectedUserId = form.watch("selectedUserId");
    const activeTeamMembers = useMemo(
        () => (teamMembers || []).filter((u: any) => u.isActive),
        [teamMembers]
    );

    const sellerOptions = useMemo(() => [
        ...(parties || [])
            .filter((p: any) => !p.type || p.type === "seller")
            .map((p: any) => ({ id: String(p.id), name: p.alias ? `${p.name} (${p.alias})` : p.name })),
    ], [parties]);

    const partyOptions = useMemo(() => [
        ...(parties || [])
            .filter((p: any) => p.type === "ship_to")
            .map((p: any) => ({ id: String(p.id), name: p.alias ? `${p.name} (${p.alias})` : p.name })),
    ], [parties]);

    useEffect(() => {
        if (!selectedSellerId || selectedSellerId === "__create_new__") return;
        const party = parties.find((p: any) => String(p.id) === selectedSellerId);
        if (!party) return;
        form.setValue("sellerName", party.name || "");
        form.setValue("sellerEmail", party.email || "");
        form.setValue("sellerAddress", party.address || "");
        form.setValue("sellerGstNo", party.gstNo || "");
        form.setValue("sellerPanNo", party.pan || "");
        form.setValue("sellerMsmeNo", party.msme || "");
    }, [selectedSellerId, parties, form]);

    useEffect(() => {
        if (!selectedPartyId || selectedPartyId === "__create_new__") return;
        const party = parties.find((p: any) => String(p.id) === selectedPartyId);
        if (!party) return;
        form.setValue("shipToName", party.name || "");
        form.setValue("shippingAddress", party.address || "");
        form.setValue("shipToGst", party.gstNo || "");
        form.setValue("shipToPan", party.pan || "");
    }, [selectedPartyId, parties, form]);

    useEffect(() => {
        if (!selectedUserId) return;
        const user = teamMembers.find((u: any) => String(u.id) === selectedUserId);
        if (!user) return;
        form.setValue("contactPersonName", user.name || "");
        form.setValue("contactPersonEmail", user.email || "");
        form.setValue("contactPersonPhone", user.mobile || "");
    }, [selectedUserId, teamMembers, form]);

    useEffect(() => {
        if (!poData) return;
        form.reset({
            poType: poData.poType || "new",
            piAttachments: poData.piAttachments ? (typeof poData.piAttachments === 'string' ? JSON.parse(poData.piAttachments) : poData.piAttachments) : [],
            category: poData.category || "",
            poDate: formatDateForInput(poData.poDate),
            sellerId: "",
            sellerName: poData.sellerName || "",
            sellerEmail: poData.sellerEmail || "",
            sellerAddress: poData.sellerAddress || "",
            sellerGstNo: poData.sellerGstNo || "",
            sellerPanNo: poData.sellerPanNo || "",
            sellerMsmeNo: poData.sellerMsmeNo || "",
            sellerCinNo: poData.sellerCinNo || "",
            contactPersonName: poData.contactPersonName || "",
            contactPersonPhone: poData.contactPersonPhone || "",
            contactPersonEmail: poData.contactPersonEmail || "",
            partyId: "",
            selectedUserId: "",
            selectedCertRecipients: poData.certRecipients?.map(String) ?? (poData.certRecipient ? [String(poData.certRecipient)] : []),
            shipToName: poData.shipToName || "",
            shippingAddress: poData.shippingAddress || "",
            shipToGst: poData.shipToGst || "",
            shipToPan: poData.shipToPan || "",
            products: (poData.products || []).map((p: any) => ({
                description: p.description || "",
                hsnSac: p.hsnSac || "",
                qty: Number(p.qty) || null,
                rate: Number(p.rate) || null,
                gstRate: Number(p.gstRate) || 18,
            })),
            quotationNo: poData.quotationNo || "",
            quotationDate: poData.quotationDate ? formatDateForInput(poData.quotationDate) : "",
            technicalSpecsAttachments: poData.technicalSpecsAttachments ? (typeof poData.technicalSpecsAttachments === 'string' ? JSON.parse(poData.technicalSpecsAttachments) : poData.technicalSpecsAttachments) : [],
            accessoriesPackagingListAttachments: poData.accessoriesPackagingListAttachments ? (typeof poData.accessoriesPackagingListAttachments === 'string' ? JSON.parse(poData.accessoriesPackagingListAttachments) : poData.accessoriesPackagingListAttachments) : [],
            termsAndConditions: poData.termsAndConditions ? (typeof poData.termsAndConditions === 'string' ? JSON.parse(poData.termsAndConditions) : poData.termsAndConditions) : [],
            remarks: poData.remarks || "",
        });
    }, [poData, form]);

    const handleAddNewParty = async () => {
        if (!newParty.name.trim()) {
            toast.error("Party name is required");
            return;
        }
        try {
            const partyData: CreatePartyDTO = {
                name: newParty.name,
                alias: newParty.alias || undefined,
                email: newParty.email || undefined,
                address: newParty.address || undefined,
                gstNo: newParty.gstNo || undefined,
                pan: newParty.pan || undefined,
                msme: newParty.msme || undefined,
                type: partyCreationType,
            };
            await createPartyMutation.mutateAsync(partyData);
            toast.success(`Party "${newParty.name}" has been added successfully.`);
            setNewParty({ name: "", alias: "", email: "", address: "", gstNo: "", pan: "", msme: "" });
            setIsAddPartyOpen(false);
            setIsShipToPartyOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add party. Please try again.");
        }
    };

    const handleSubmit = async (values: PurchaseOrderFormValues) => {
        try {
            const updateData = mapFormToUpdateDTO(values);
            await updatePOMutation.mutateAsync({ id: purchaseOrderId, data: updateData });
            toast.success(`PO #${poData?.poNumber} has been updated successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
        } catch (error: any) {
            toast.error(error?.message || "Failed to update purchase order. Please try again.");
        }
    };

    if (isPOLoading) {
        return (
            <div className="container mx-auto py-6 max-w-6xl">
                <FormSkeleton />
            </div>
        );
    }

    if (isPOError || !poData) {
        return (
            <NotFound
                message={(poError as any)?.message || "The purchase order you're looking for doesn't exist or has been removed."}
                onBack={() => navigate(-1)}
            />
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Edit Purchase Order</CardTitle>
                        <CardDescription className="mt-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline">
                                    {poData?.poNumber || "N/A"}
                                </Badge>
                                <Badge variant="secondary">
                                    Created At {new Date(poData?.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
            <CardContent className="space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        {/* ── PO Type ── */}
                <div className="rounded-lg border p-4 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        PO Type
                    </h3>
                    <div className="flex gap-4">
                        <div className={`flex-1 rounded-lg border-2 p-4 ${
                            poData?.poType === "pi" ? "border-muted" : "border-primary bg-primary/5"
                        }`}>
                            <p className="font-semibold text-base">New PO</p>
                            <p className="text-sm text-muted-foreground mt-1">Fresh purchase order</p>
                        </div>
                        <div className={`flex-1 rounded-lg border-2 p-4 ${
                            poData?.poType === "pi" ? "border-primary bg-primary/5" : "border-muted"
                        }`}>
                            <p className="font-semibold text-base">PI Based</p>
                            <p className="text-sm text-muted-foreground mt-1">Against proforma invoice</p>
                        </div>
                    </div>
                    {poData?.poType === "pi" && poData?.piAttachments && (
                        <div className="pt-2">
                            <p className="text-sm font-medium mb-2">Invoice Copy</p>
                            {(() => {
                                const attachments = typeof poData.piAttachments === 'string'
                                    ? JSON.parse(poData.piAttachments)
                                    : poData.piAttachments;
                                return Array.isArray(attachments) && attachments.length > 0 ? (
                                    <ul className="space-y-1">
                                        {attachments.map((path: string, i: number) => (
                                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {path.split("/").pop()}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No invoice copy uploaded</p>
                                );
                            })()}
                        </div>
                    )}
                    <div className="pt-2 max-w-md">
                        <SelectField
                            control={form.control}
                            name="category"
                            label={<><FileText className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Category <span className="text-destructive">*</span></>}
                            options={[
                                { id: "Supply", name: "Supply" },
                                { id: "Service", name: "Service" },
                                { id: "Freight", name: "Freight" },
                                { id: "Admin/Misc.", name: "Admin/Misc." },
                                { id: "Buyback/Sale", name: "Buyback/Sale" },
                                { id: "GEM Charges", name: "GEM Charges" },
                            ]}
                            placeholder="Select category..."
                        />
                    </div>
                </div>

                {/* ── PO Details ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    PO Number
                                </Label>
                                <Input value={poData?.poNumber || "N/A"} disabled className="bg-muted font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Project Name
                                </Label>
                                <Input value={poData?.projectName || ""} disabled className="bg-muted" />
                            </div>
                            <FieldWrapper control={form.control} name="poDate" label={<><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />PO Date <span className="text-destructive">*</span></>}>
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 mt-6">
                            {/* ── Seller Information ── */}
                            <div className="border rounded-lg border-primary border-dashed p-2 my-3 w-full md:w-1/2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Seller Information
                                    </h3>
                                    <Dialog open={isAddPartyOpen} onOpenChange={(open) => { setIsAddPartyOpen(open); if (open) setPartyCreationType("seller"); }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" type="button" onClick={() => setPartyCreationType("seller")}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add New Seller
                                            </Button>
                                        </DialogTrigger>
                                        <AddPartyDialog
                                            newParty={newParty}
                                            setNewParty={setNewParty}
                                            onSubmit={handleAddNewParty}
                                            onClose={() => setIsAddPartyOpen(false)}
                                            isLoading={createPartyMutation.isPending}
                                        />
                                    </Dialog>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 mb-6">
                                    <SelectField
                                        control={form.control}
                                        name="sellerId"
                                        label="Select Existing Seller"
                                        options={sellerOptions}
                                        placeholder="Choose a seller..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <FieldWrapper control={form.control} name="sellerName" label={<>Seller Name <span className="text-destructive">*</span></>}>
                                        {(field) => <Input {...field} placeholder="Enter seller name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerEmail" label={<><Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Seller Email</>}>
                                        {(field) => <Input {...field} type="email" placeholder="seller@example.com" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerGstNo" label="GST Number">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. 27ABCDE1234F1Z5"
                                                className="font-mono"
                                                maxLength={15}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Seller Address</>}>
                                        {(field) => <Textarea {...field} placeholder="Enter complete address" rows={2} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerPanNo" label="PAN Number">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. ABCDE1234F"
                                                className="font-mono"
                                                maxLength={10}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerMsmeNo" label="MSME Number">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. UDYAM-XX-00-0000000"
                                                className="font-mono"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sellerCinNo" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Seller CIN Number</>}>
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. U74999KA2020PTC123456"
                                                className="font-mono"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                            {/* ── Ship To Details ── */}
                            <div className="border rounded-lg border-sidebar-primary-foreground border-dashed p-2 my-3 w-full md:w-1/2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Ship To Details
                                    </h3>
                                    <Dialog open={isShipToPartyOpen} onOpenChange={(open) => { setIsShipToPartyOpen(open); if (open) setPartyCreationType("ship_to"); }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" type="button" onClick={() => setPartyCreationType("ship_to")}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add New Ship To
                                            </Button>
                                        </DialogTrigger>
                                        <AddPartyDialog
                                            newParty={newParty}
                                            setNewParty={setNewParty}
                                            onSubmit={handleAddNewParty}
                                            onClose={() => setIsShipToPartyOpen(false)}
                                            isLoading={createPartyMutation.isPending}
                                        />
                                    </Dialog>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 mb-6">
                                    <SelectField
                                        control={form.control}
                                        name="partyId"
                                        label="Select Destination"
                                        options={partyOptions}
                                        placeholder="Choose shipping destination..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FieldWrapper control={form.control} name="shipToName" label={<>Ship To Name <span className="text-destructive">*</span></>}>
                                        {(field) => <Input {...field} placeholder="Enter recipient name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="shippingAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Shipping Address <span className="text-destructive">*</span></>}>
                                        {(field) => <Textarea {...field} placeholder="Enter complete shipping address" rows={3} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="shipToGst" label="GST Number">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. 27ABCDE1234F1Z5"
                                                className="font-mono"
                                                maxLength={15}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="shipToPan" label="PAN Number">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. ABCDE1234F"
                                                className="font-mono"
                                                maxLength={10}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
                            <SelectField
                                control={form.control}
                                name="selectedUserId"
                                label={<><UserCheck className="h-3.5 w-3.5 inline mr-1" />Quick Fill from Team Member</>}
                                options={activeTeamMembers.map((u: any) => ({ id: String(u.id), name: u.name }))}
                                placeholder="Select a user to auto-fill contact details..."
                            />
                            <FieldWrapper control={form.control} name="contactPersonName" label="Contact Person Name">
                                {(field) => <Input {...field} placeholder="Enter contact person name" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="contactPersonPhone" label={<><Phone className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Contact Person Phone</>}>
                                {(field) => <Input {...field} placeholder="e.g. +91-9876543210" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="contactPersonEmail" label={<><Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Contact Person Email</>}>
                                {(field) => <Input {...field} type="email" placeholder="contact@example.com" />}
                            </FieldWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
                            <div className="space-y-1">
                                <MultiSelectField
                                    control={form.control}
                                    name="selectedCertRecipients"
                                    label="Test Certificate Recipients"
                                    options={activeTeamMembers.map((u: any) => ({ value: String(u.id), label: `${u.name} (${u.email})` }))}
                                    placeholder="Select recipients for test certificate..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Select the team members who should receive the test certificate and invoice via email
                                </p>
                            </div>
                        </div>

                        {/* ── Products ── */}
                        <ProductsField control={form.control} />

                        {/* ── Additional Details ── */}
                        <div className="border rounded-lg border-secondary border-dashed p-4 space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                                <FieldWrapper control={form.control} name="quotationNo" label="Quotation Number">
                                    {(field) => <Input {...field} placeholder="e.g. QTN-2024-001" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="quotationDate" label="Quotation Date">
                                    {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                            </div>

                            <TermsField control={form.control} />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <TenderFileUploader
                                    label="Technical Specifications Attachments"
                                    context="tender-documents"
                                    value={form.watch("technicalSpecsAttachments")}
                                    onChange={(paths) => form.setValue("technicalSpecsAttachments", paths)}
                                />
                                <TenderFileUploader
                                    label="Accessories / Packaging List Attachments"
                                    context="tender-documents"
                                    value={form.watch("accessoriesPackagingListAttachments")}
                                    onChange={(paths) => form.setValue("accessoriesPackagingListAttachments", paths)}
                                />
                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => <Textarea {...field} placeholder="Any additional notes or remarks..." rows={3} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-end gap-4 mt-3">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updatePOMutation.isPending} className="min-w-[160px]">
                                    {updatePOMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" />Save Changes</>
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

interface AddPartyDialogProps {
    newParty: NewPartyForm;
    setNewParty: React.Dispatch<React.SetStateAction<NewPartyForm>>;
    onSubmit: () => void;
    onClose: () => void;
    isLoading?: boolean;
}

const AddPartyDialog: React.FC<AddPartyDialogProps> = ({ newParty, setNewParty, onSubmit, onClose, isLoading = false }) => {
    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Party
                </DialogTitle>
                <DialogDescription>Add a new party to use as seller or shipping destination.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Party Name <span className="text-destructive">*</span></Label>
                        <Input value={newParty.name} onChange={(e) => setNewParty({ ...newParty, name: e.target.value })} placeholder="Enter party name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Alias</Label>
                        <Input value={newParty.alias} onChange={(e) => setNewParty({ ...newParty, alias: e.target.value })} placeholder="e.g. Factory, HO, Branch" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newParty.email} onChange={(e) => setNewParty({ ...newParty, email: e.target.value })} placeholder="example@email.com" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea value={newParty.address} onChange={(e) => setNewParty({ ...newParty, address: e.target.value })} placeholder="Enter complete address" rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            GST Number
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                    <TooltipContent>15-character GST identification number</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <Input value={newParty.gstNo} onChange={(e) => setNewParty({ ...newParty, gstNo: e.target.value.toUpperCase() })} placeholder="27ABCDE1234F1Z5" className="font-mono" maxLength={15} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            PAN Number
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                    <TooltipContent>10-character Permanent Account Number</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <Input value={newParty.pan} onChange={(e) => setNewParty({ ...newParty, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" className="font-mono" maxLength={10} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            MSME Number
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                    <TooltipContent>Udyam Registration Number</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <Input value={newParty.msme} onChange={(e) => setNewParty({ ...newParty, msme: e.target.value.toUpperCase() })} placeholder="UDYAM-XX-00-0000000" className="font-mono" />
                    </div>
                </div>
            </div>
            <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="button" onClick={onSubmit} disabled={!newParty.name.trim() || isLoading} className="min-w-[100px]">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : <><UserPlus className="mr-2 h-4 w-4" />Add Party</>}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};
