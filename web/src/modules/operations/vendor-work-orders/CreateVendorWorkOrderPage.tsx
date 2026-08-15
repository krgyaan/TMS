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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useCreatePoParty, usePoParties } from "@/hooks/api/usePurchaseOrders";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useNextVWONumber, useCreateVendorWorkOrder } from "@/hooks/api/useVendorWorkOrders";
import { useCreatePurchaseInvoice } from "@/hooks/api/usePurchaseInvoices";
import { InvoiceUploadField } from "@/modules/operations/purchase-invoices/components/InvoiceUploadField";
import type { CreatePurchaseInvoiceDTO } from "@/modules/operations/purchase-invoices/helpers/purchaseInvoice.types";
import { VWOProductsField } from "./components/VWOProductsField";
import { VWOTermsField } from "./components/VWOTermsField";
import { DEFAULT_VWO_TERMS_ROWS } from "./helpers/vwoForm.constants";
import { VWOFormPreview } from "./components/VWOFormPreview";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Calendar, Eye, FileText, Hash, Mail, MapPin, Phone, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDateForInput, mapVwoFormToCreateDTO } from "./helpers/vwoForm.mapper";
import { vendorWorkOrderFormSchema, type VendorWorkOrderFormValues } from "./helpers/vwoForm.schema";
import { PartyFormDialog, type CreatePartyPayload } from "@/modules/operations/vendor-master/PartyFormDialog";

const defaultFormValues: VendorWorkOrderFormValues = {
  woDate: formatDateForInput(new Date()),
  category: "",
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
  products: [{ description: "", qty: null, rate: null, gstRate: 18 }],
  termsAndConditions: DEFAULT_VWO_TERMS_ROWS,
  scopeOfWork: [],
  accessoriesPackagingListAttachments: [],
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

export default function CreateVendorWorkOrderPage() {
  const navigate = useNavigate();
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const { teamId } = useAuth();

  const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
  const { data: partiesData } = usePoParties();
  const createPartyMutation = useCreatePoParty();

  const parties = partiesData || [];

  const projectName = overview?.project?.projectName;
  const { data: nextWONumber, isLoading: isLoadingWONumber } = useNextVWONumber(projectName);

  const [showPreview, setShowPreview] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);
  const [partyCreationType, setPartyCreationType] = useState<"seller" | "ship_to">("seller");

  const form = useForm<VendorWorkOrderFormValues>({
    resolver: zodResolver(vendorWorkOrderFormSchema) as any,
    defaultValues: defaultFormValues,
  });
  const selectedSellerId = form.watch("sellerId");
  const selectedPartyId = form.watch("partyId");

  const { data: teamMembers = [] } = useGetTeamMembers(0);
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
      const partyDataDTO = {
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
      await createPartyMutation.mutateAsync(partyDataDTO);
      toast.success(`Party "${partyData.name}" has been added successfully.`);
      setIsAddPartyOpen(false);
      setIsShipToPartyOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to add party. Please try again.");
    }
  };

  const createVWOMutation = useCreateVendorWorkOrder();
  const createPIMutation = useCreatePurchaseInvoice();

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (values: VendorWorkOrderFormValues) => {
    try {
      const vwoData = mapVwoFormToCreateDTO(values, overview?.tender?.id || 3613, projectId, overview?.project?.projectName);
      const result = await createVWOMutation.mutateAsync(vwoData);
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
            vendorWorkOrderId: result.id,
          };
          const invoice = await createPIMutation.mutateAsync(invoiceData);
          invoiceMessage = ` Purchase Invoice #${invoice.invoiceNo} created successfully.`;
        } catch {
          toast.error("WO created, but invoice upload failed. Upload the invoice later from the WO.");
        }
      }
      toast.success(`WO #${result.woNumber} has been created successfully.${invoiceMessage}`);
      navigate(paths.operations.projectDashboard(projectId));
    } catch {
      toast.error("Failed to create vendor work order. Please try again.");
    }
  };

  if (showPreview) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <VWOFormPreview
          formValues={form.getValues()}
          projectName={overview?.project?.projectName}
          nextWONumber={nextWONumber}
          isSubmitting={createVWOMutation.isPending}
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
            <CardTitle>Raise Vendor Work Order</CardTitle>
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
        {/* ── WO Details ── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  WO Number
                </Label>
                <Input value={isLoadingWONumber ? "Loading..." : nextWONumber} readOnly className="bg-muted font-mono w-full" title={nextWONumber || "Loading..."} />
                <p className="text-xs text-muted-foreground">Preview — final number is assigned upon creation</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Project Name
                </Label>
                <Input value={overview?.project?.projectName || ""} readOnly className="bg-muted" />
              </div>
              <FieldWrapper control={form.control} name="woDate" label={<><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />WO Date <span className="text-destructive">*</span></>}>
                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
              </FieldWrapper>
              <SelectField
                control={form.control}
                name="category"
                label={<><FileText className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Category</>}
                options={[
                  { id: "Service", name: "Service" },
                  { id: "Freight", name: "Freight" },
                ]}
                placeholder="Select category..."
              />
            </div>

            {/* ── Invoice Upload (optional) ── */}
            <div className="my-4">
              <InvoiceUploadField control={form.control} />
            </div>

            <div className="flex flex-col md:flex-row gap-6 mt-6">
              {/* ── Seller Information ── */}
              <div className="border rounded-lg border-primary border-dashed p-2 my-3 w-full md:w-1/2">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold flex items-center gap-2">
                     <Building2 className="h-5 w-5" />
                     Vendor Information
                   </h3>
                   <Button variant="outline" size="sm" type="button" onClick={() => { setPartyCreationType("seller"); setIsAddPartyOpen(true); }}>
                     <UserPlus className="mr-2 h-4 w-4" />
                     Add New Vendor
                   </Button>
                 </div>
                 <PartyFormDialog
                   title="Add New Vendor"
                   description="Add a new party to use as a vendor."
                   open={isAddPartyOpen}
                   onOpenChange={(open) => { setIsAddPartyOpen(open); if (open) setPartyCreationType("seller"); }}
                   onSubmit={handleAddNewParty}
                   isLoading={createPartyMutation.isPending}
                 />
                <p className="text-sm text-muted-foreground mb-4">Select or enter vendor details</p>
                <div className="mb-6 max-w-md">
                  <SelectField
                    control={form.control}
                    name="sellerId"
                    label="Select Existing Vendor"
                    options={sellerOptions}
                    placeholder="Choose a vendor..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper control={form.control} name="sellerName" label={<>Vendor Name <span className="text-destructive">*</span></>}>
                      {(field) => <Input {...field} placeholder="Enter vendor name" />}
                    </FieldWrapper>
                    <FieldWrapper control={form.control} name="sellerEmail" label={<><Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Vendor Email</>}>
                      {(field) => <Input {...field} type="email" placeholder="vendor@example.com" />}
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
                    <FieldWrapper control={form.control} name="sellerAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Vendor Address</>}>
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
                    <FieldWrapper control={form.control} name="sellerCinNo" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />CIN Number</>}>
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

            {/* ── Contact Person ── */}
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

            {/* ── Cert Recipients ── */}
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
            <VWOProductsField control={form.control} />

            {/* ── Additional Details ── */}
            <div className="border rounded-lg border-secondary border-dashed p-4 space-y-6 mt-6">
              <VWOTermsField control={form.control} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <FileUploader
                  label="Scope of Work"
                  context="tender-documents"
                  value={form.watch("scopeOfWork")}
                  onChange={(paths) => form.setValue("scopeOfWork", paths)}
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
