import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { MultiSelectField } from "@/components/form/MultiSelectField";
import { FileUploader } from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useCreatePoParty, useCreatePurchaseOrder, useNextPONumber, usePoParties } from "@/hooks/api/usePurchaseOrders";
import { useCreatePurchaseInvoice } from "@/hooks/api/usePurchaseInvoices";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Calendar, Eye, FileText, Hash, Mail, MapPin, Phone, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { POFormPreview } from "../components/POFormPreview";
import { ProductsField } from "../components/ProductsField";
import { DEFAULT_TERMS_ROWS, TermsField } from "../components/TermsField";
import { formatDateForInput, mapFormToCreateDTO } from "../helpers/purchaseOrder.mapper";
import type { CreatePartyDTO } from "../helpers/purchaseOrder.types";
import type { CreatePurchaseInvoiceDTO } from "@/modules/operations/purchase-invoices/helpers/purchaseInvoice.types";
import { purchaseOrderFormSchema, type PurchaseOrderFormValues } from "../helpers/purchaseOrder.schema";
import { PartyFormDialog, type CreatePartyPayload } from "@/modules/operations/vendor-master/PartyFormDialog";
import { InvoiceUploadField } from "@/modules/operations/purchase-invoices/components/InvoiceUploadField";
import { Label } from "@/components/ui/label";

const defaultFormValues: PurchaseOrderFormValues = {
  poType: "new",
  piAttachments: [],
  category: "",
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
  selectedUserId: "",
  selectedCertRecipients: [],
  shipToName: "",
  shippingAddress: "",
  shipToGst: "",
  shipToPan: "",
  products: [
    { description: "", qty: null, unit: "", rate: null, gstRate: 0 }
  ],
  quotationNo: "",
  quotationDate: "",
  technicalSpecsAttachments: [],
  accessoriesPackagingListAttachments: [],
  termsAndConditions: DEFAULT_TERMS_ROWS,
  remarks: "",
  uploadInvoice: "no",
  invoiceDate: "",
  invoiceValue: null,
  invoiceGst: null,
  invoiceFile: [],
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

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const { teamId } = useAuth();

  const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
  const { data: partiesData } = usePoParties();
  const createPOMutation = useCreatePurchaseOrder();
  const createPartyMutation = useCreatePoParty();
  const createPIMutation = useCreatePurchaseInvoice();

  const { data: nextPONumber } = useNextPONumber(overview?.project?.projectName);

  const parties = partiesData || [];

  const [showPreview, setShowPreview] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);
  const [partyCreationType, setPartyCreationType] = useState<"seller" | "ship_to">("seller");

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema) as any,
    defaultValues: defaultFormValues,
  });
  const selectedSellerId = form.watch("sellerId");
  const selectedPartyId = form.watch("partyId");

  const { data: teamMembers = [] } = useGetTeamMembers(0); // all active team members across teams
  console.log("Team Members for PO Form:", teamMembers);
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
    form.setValue("contactPersonName", party.contactPerson || "");
    form.setValue("contactPersonEmail", party.email || "");
    form.setValue("contactPersonPhone", party.mobileNumber || "");
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

  const handleAddNewParty = async (partyData: CreatePartyPayload) => {
    if (!partyData.name.trim()) {
      toast.error("Party name is required");
      return;
    }
    try {
      const dto: CreatePartyDTO = {
        name: partyData.name,
        alias: partyData.alias || undefined,
        email: partyData.email || undefined,
        address: partyData.address || undefined,
        gstNo: partyData.gstNo || undefined,
        pan: partyData.pan || undefined,
        msme: partyData.msme || undefined,
        type: partyCreationType,
        contact_person: partyData.contact_person || undefined,
        mobile_number: partyData.mobile_number || undefined,
      };
      await createPartyMutation.mutateAsync(dto);
      toast.success(`Party "${partyData.name}" has been added successfully.`);
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
      let invoiceMessage = "";
      if (values.uploadInvoice === "yes") {
        try {
          const invoiceData: CreatePurchaseInvoiceDTO = {
            projectId,
            projectName: overview?.project?.projectName,
            category: values.category,
            partyName: values.sellerName,
            valuePreGst: values.invoiceValue!,
            gstAmount: values.invoiceGst!,
            invoiceDate: values.invoiceDate,
            invoiceFile: values.invoiceFile?.[0] || undefined,
            purchaseOrderId: result.id,
          };
          const invoice = await createPIMutation.mutateAsync(invoiceData);
          invoiceMessage = ` Purchase Invoice #${invoice.invoiceNo} created successfully.`;
        } catch {
          toast.error("PO created, but invoice upload failed. Upload the invoice later from the PO.");
        }
      }
      toast.success(`PO #${result.poNumber} has been created successfully.${invoiceMessage}`);
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
          teamMembers={activeTeamMembers}
          teamId={teamId}
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Raise Purchase Order</CardTitle>
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
      <CardContent className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* ── PO Type ── */}
            <div className="rounded-lg border p-4 space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <SelectField
                  control={form.control}
                  name="poType"
                  label="PO Type *"
                  options={[
                    { id: "new", name: "New PO" },
                    { id: "pi", name: "PI Based" },
                  ]}
                  placeholder="Select PO type..."
                />
                <SelectField
                  control={form.control}
                  name="category"
                  label={<><FileText className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Category <span className="text-destructive">*</span></>}
                  options={[
                    { id: "Supply", name: "Supply" },
                    { id: "Admin/Misc.", name: "Admin/Misc." },
                    { id: "Buyback/Sale", name: "Buyback/Sale" },
                  ]}
                  placeholder="Select category..."
                />
                {form.watch("poType") === "pi" && (
                  <div className="space-y-1">
                    <FileUploader
                      label="Invoice Copy *"
                      context="tender-documents"
                      value={form.watch("piAttachments")}
                      onChange={(paths) => form.setValue("piAttachments", paths)}
                    />
                    {form.formState.errors.piAttachments && (
                      <p className="text-sm text-destructive">{form.formState.errors.piAttachments.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Invoice Upload (optional) ── */}
            <div className="mb-4">
              <InvoiceUploadField control={form.control} />
            </div>

            {/* ── PO Details ── */}
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

            <div className="flex flex-col md:flex-row gap-6 mt-6">
              {/* ── Seller Information ── */}
               <div className="border rounded-lg border-primary border-dashed p-2 my-3 w-full md:w-1/2">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                     <Building2 className="h-5 w-5" />
                     Seller Information
                   </h3>
                   <Button variant="outline" size="sm" type="button" onClick={() => { setPartyCreationType("seller"); setIsAddPartyOpen(true); }}>
                     <UserPlus className="mr-2 h-4 w-4" />
                     Add New Seller
                   </Button>
                 </div>
                 <PartyFormDialog
                   title="Add New Seller"
                   description="Add a new party to use as a seller."
                   open={isAddPartyOpen}
                   onOpenChange={(open) => { setIsAddPartyOpen(open); if (open) setPartyCreationType("seller"); }}
                   onSubmit={handleAddNewParty}
                   isLoading={createPartyMutation.isPending}
                 />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
              {/* ── Ship To Details ── */}
               <div className="border rounded-lg border-sidebar-primary-foreground border-dashed p-2 my-3 w-full md:w-1/2">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                     <MapPin className="h-5 w-5" />
                     Ship To Details
                   </h3>
                   <Button variant="outline" size="sm" type="button" onClick={() => { setPartyCreationType("ship_to"); setIsShipToPartyOpen(true); }}>
                     <UserPlus className="mr-2 h-4 w-4" />
                     Add New Ship To
                   </Button>
                 </div>
                 <PartyFormDialog
                   title="Add New Ship To"
                   description="Add a new party to use as a shipping destination."
                   open={isShipToPartyOpen}
                   onOpenChange={(open) => { setIsShipToPartyOpen(open); if (open) setPartyCreationType("ship_to"); }}
                   onSubmit={handleAddNewParty}
                   isLoading={createPartyMutation.isPending}
                 />
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
                )}
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
                <FileUploader
                  label="Technical Specs Attachments"
                  context="tender-documents"
                  value={form.watch("technicalSpecsAttachments")}
                  onChange={(paths) => form.setValue("technicalSpecsAttachments", paths)}
                />
                <FileUploader
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
