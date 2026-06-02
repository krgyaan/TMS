import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePoParty, useCreatePurchaseOrder, useNextPONumber, usePoParties, useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Calendar, Eye, FileText, Hash, Info, Loader2, Mail, MapPin, Phone, Receipt, UserCheck, UserPlus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { POFormPreview } from "./components/POFormPreview";
import { ProductsField } from "./components/ProductsField";
import { formatDateForInput, mapFormToCreateDTO } from "./helpers/projectDashboard.mapper";
import type { CreatePartyDTO } from "./helpers/projectDashboard.types";
import { purchaseOrderFormSchema, type PurchaseOrderFormValues } from "./helpers/purchaseOrder.schema";

interface NewPartyForm {
  name: string;
  email: string;
  address: string;
  gstNo: string;
  pan: string;
  msme: string;
}

const defaultFormValues: PurchaseOrderFormValues = {
  poDate: formatDateForInput(new Date()),
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
  shipToName: "",
  shippingAddress: "",
  shipToGst: "",
  shipToPan: "",
  products: [{ description: "", hsnSac: "", qty: null, rate: null, gstRate: 18 }],
  quotationNo: "",
  quotationDate: "",
  warrantyDispatch: "25 Years",
  warrantyInstallation: "",
  freight: "Extra as per actual.",
  deliveryPeriod: "within 4 weeks",
  transitInsurance: "Inclusive",
  materialUnloading: "",
  paymentTerms: "30% Advance with the PO and remaining 70% before dispatch against PI.",
  poRaisedBy: "",
  technicalSpecifications: "As per approved drawing",
  technicalSpecsAttachments: [],
  accessoriesPackagingList: "NA",
  accessoriesPackagingListAttachments: [],
  preDispatchInspection: "",
  deliveryLocation: "",
  acceptanceOfOrder: "",
  documentation: "The party shall confirm acceptance to this Purchase Order by duly Stamping and signing on each page of the technical specifications as well as attached documents (If Any).",
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

export default function RaisePoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const projectId = Number(id);

  const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
  const { data: partiesData } = usePoParties();
  const createPOMutation = useCreatePurchaseOrder();
  const createPartyMutation = useCreatePoParty();

  const { data: nextPONumber } = useNextPONumber(overview?.project?.projectName);

  const parties = partiesData || [];

  const [showPreview, setShowPreview] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);
  const [newParty, setNewParty] = useState<NewPartyForm>({ name: "", email: "", address: "", gstNo: "", pan: "", msme: "" });

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema) as any,
    defaultValues: defaultFormValues,
  });
  const selectedSellerId = form.watch("sellerId");
  const selectedPartyId = form.watch("partyId");

  const { effectiveTeamId } = useAuth();
  const { data: teamMembers = [] } = useGetTeamMembers(effectiveTeamId ?? 2);
  const [selectedUserId, setSelectedUserId] = useState("");

  const sellerOptions = useMemo(() => [
    { id: "__create_new__", name: "Create New" },
    ...(parties || []).map((p: any) => ({ id: String(p.id), name: p.name })),
  ], [parties]);

  const partyOptions = useMemo(() => [
    { id: "__create_new__", name: "Create New" },
    ...(parties || []).map((p: any) => ({ id: String(p.id), name: p.name })),
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

  const handleAddNewParty = async () => {
    if (!newParty.name.trim()) {
      toast.error("Party name is required");
      return;
    }
    try {
      const partyData: CreatePartyDTO = {
        name: newParty.name,
        email: newParty.email || undefined,
        address: newParty.address || undefined,
        gstNo: newParty.gstNo || undefined,
        pan: newParty.pan || undefined,
        msme: newParty.msme || undefined,
      };
      await createPartyMutation.mutateAsync(partyData);
      toast.success(`Party "${newParty.name}" has been added successfully.`);
      setNewParty({ name: "", email: "", address: "", gstNo: "", pan: "", msme: "" });
      setIsAddPartyOpen(false);
      setIsShipToPartyOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to add party. Please try again.");
    }
  };

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (values: PurchaseOrderFormValues) => {
    try {
      const poData = mapFormToCreateDTO(values, overview?.tender?.id || 3613, projectId, overview?.project?.projectName);
      const result = await createPOMutation.mutateAsync(poData);
      toast.success(`PO #${result.poNumber} has been created successfully.`);
      navigate(paths.operations.projectDashboard(projectId));
    } catch (error: any) {
      toast.error(error?.message || "Failed to create purchase order. Please try again.");
    }
  };

  if (showPreview) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <POFormPreview
          formValues={form.getValues()}
          projectName={overview?.project?.projectName}
          nextPONumber={nextPONumber}
          isSubmitting={createPOMutation.isPending}
          onBack={() => setShowPreview(false)}
          onSubmit={form.handleSubmit(handleSubmit)}
        />
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <FormSkeleton />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  Raise Purchase Order
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      {overview?.tender?.tenderNumber || "N/A"}
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
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
          <CardContent className="space-y-8">
            {/* ── PO Details ── */}
            <div>
              <h3 className="text-lg font-semibold mb-4">PO Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    PO Number
                  </Label>
                  <Input value={nextPONumber || "Loading..."} readOnly className="bg-muted font-mono w-full" title={nextPONumber || "Loading..."} />
                  <p className="text-xs text-muted-foreground">Preview — final number is assigned upon creation</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Project Name
                  </Label>
                  <Input value={overview?.project?.projectName || ""} readOnly className="bg-muted" />
                </div>
                <FieldWrapper control={form.control} name="poDate" label={<><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />PO Date <span className="text-destructive">*</span></>}>
                  {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                </FieldWrapper>
              </div>
            </div>

            <Separator />

            {/* ── Seller Information ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Seller Information
                </h3>
                <Dialog open={isAddPartyOpen} onOpenChange={setIsAddPartyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Party
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
              <p className="text-sm text-muted-foreground mb-4">Select or enter seller/vendor details</p>

              <div className="mb-6 max-w-md">
                <SelectField
                  control={form.control}
                  name="sellerId"
                  label="Select Existing Seller"
                  options={sellerOptions}
                  placeholder="Choose a seller..."
                />
              </div>

              {selectedSellerId && selectedSellerId !== "" && (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
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
              )}

              <Separator className="my-6" />
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5" />
                  Quick Fill from Team Member
                </p>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue placeholder="Select a user to auto-fill contact details..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Selecting a user will populate the contact person fields below</p>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-4">Contact Person</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            <Separator />

            {/* ── Ship To Details ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ship To Details
                </h3>
                <Dialog open={isShipToPartyOpen} onOpenChange={setIsShipToPartyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Party
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
              <p className="text-sm text-muted-foreground mb-4">Delivery destination information</p>

              <div className="mb-6 max-w-md">
                <SelectField
                  control={form.control}
                  name="partyId"
                  label="Select Destination"
                  options={partyOptions}
                  placeholder="Choose shipping destination..."
                />
              </div>

              {selectedPartyId && selectedPartyId !== "" && (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
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
              )}
            </div>

            <Separator />

            {/* ── Products ── */}
            <ProductsField control={form.control} />

            <Separator />

            {/* ── Additional Details (always visible) ── */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                Additional Details
              </h3>

              <p className="text-sm font-medium text-muted-foreground mb-3">Quotation</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <FieldWrapper control={form.control} name="quotationNo" label="Quotation Number">
                  {(field) => <Input {...field} placeholder="e.g. QTN-2024-001" />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="quotationDate" label="Quotation Date">
                  {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                </FieldWrapper>
              </div>

              <Separator className="my-6" />
              <p className="text-sm font-medium text-muted-foreground mb-3">Warranty</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <FieldWrapper control={form.control} name="warrantyDispatch" label="Warranty (Dispatch)">
                  {(field) => <Input {...field} placeholder="e.g. 12 months from dispatch" />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="warrantyInstallation" label="Warranty (Installation)">
                  {(field) => <Input {...field} placeholder="e.g. 24 months from installation" />}
                </FieldWrapper>
              </div>

              <Separator className="my-6" />
              <p className="text-sm font-medium text-muted-foreground mb-3">Shipping & Logistics</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <FieldWrapper control={form.control} name="freight" label="Freight">
                  {(field) => <Input {...field} placeholder="e.g. Paid by seller" />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="deliveryPeriod" label="Delivery Period">
                  {(field) => <Input {...field} placeholder="e.g. 15-20 working days" />}
                </FieldWrapper>

                <FieldWrapper control={form.control} name="transitInsurance" label="Transit Insurance">
                  {(field) => <Textarea {...field} placeholder="e.g. To be covered by buyer" rows={2} />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="materialUnloading" label="Material Unloading">
                  {(field) => <Textarea {...field} placeholder="e.g. At buyer's responsibility" rows={2} />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="preDispatchInspection" label="Pre-Dispatch Inspection">
                  {(field) => <Textarea {...field} placeholder="e.g. To be carried out by seller before dispatch" rows={2} />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="deliveryLocation" label="Delivery Location">
                  {(field) => <Input {...field} placeholder="e.g. Site location - Mumbai Warehouse" />}
                </FieldWrapper>
              </div>

              <Separator className="my-6" />
              <p className="text-sm font-medium text-muted-foreground mb-3">Technical Specifications</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <FieldWrapper control={form.control} name="technicalSpecifications" label="Technical Specifications">
                  {(field) => <Textarea {...field} placeholder="Enter any technical specifications or requirements..." rows={3} />}
                </FieldWrapper>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Upload Attachments</Label>
                  <TenderFileUploader
                    context="tender-documents"
                    value={form.watch("technicalSpecsAttachments")}
                    onChange={(paths) => form.setValue("technicalSpecsAttachments", paths)}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              <p className="text-sm font-medium text-muted-foreground mb-3">Accessories / Packaging List</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <FieldWrapper control={form.control} name="accessoriesPackagingList" label="Accessories / Packaging List">
                  {(field) => <Textarea {...field} placeholder="List of accessories and packaging details..." rows={3} />}
                </FieldWrapper>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Upload Attachments</Label>
                  <TenderFileUploader
                    context="tender-documents"
                    value={form.watch("accessoriesPackagingListAttachments")}
                    onChange={(paths) => form.setValue("accessoriesPackagingListAttachments", paths)}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              <p className="text-sm font-medium text-muted-foreground mb-3">Terms & Documentation</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <FieldWrapper control={form.control} name="paymentTerms" label="Payment Terms">
                  {(field) => <Textarea {...field} placeholder="e.g. 30 days from invoice date" rows={2} />}
                </FieldWrapper>
                <FieldWrapper control={form.control} name="poRaisedBy" label={<><UserPlus className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />PO Raised By</>}>
                  {(field) => <Input {...field} placeholder="Enter name" />}
                </FieldWrapper>

                <FieldWrapper control={form.control} name="acceptanceOfOrder" label="Acceptance of Order">
                  {(field) => <Textarea {...field} placeholder="e.g. Order shall be deemed accepted within 7 days..." rows={2} />}
                </FieldWrapper>

                <FieldWrapper control={form.control} name="documentation" label="Documentation">
                  {(field) => <Textarea {...field} placeholder="List of required documents..." rows={3} />}
                </FieldWrapper>

                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                  {(field) => <Textarea {...field} placeholder="Any additional notes or remarks..." rows={3} />}
                </FieldWrapper>
              </div>
            </div>

            <Separator />

            {/* ── Footer ── */}
            <div className="flex items-end justify-end">
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handlePreview} className="min-w-[160px]">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview & Create
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
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
            <Label>Email</Label>
            <Input type="email" value={newParty.email} onChange={(e) => setNewParty({ ...newParty, email: e.target.value })} placeholder="example@email.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea value={newParty.address} onChange={(e) => setNewParty({ ...newParty, address: e.target.value })} placeholder="Enter complete address" rows={2} />
        </div>
        <Separator />
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
