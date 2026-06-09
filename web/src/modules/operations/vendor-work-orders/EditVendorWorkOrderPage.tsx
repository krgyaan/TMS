import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
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
import { useCreatePoParty, usePoParties, useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { useVendorWorkOrderDetails, useUpdateVendorWorkOrder } from "@/hooks/api/useVendorWorkOrders";
import { VWOProductsField } from "./components/VWOProductsField";
import { VWOTermsField } from "./components/VWOTermsField";
import { DEFAULT_VWO_TERMS_ROWS } from "./helpers/vwoForm.constants";
import { VWOFormPreview } from "./components/VWOFormPreview";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Calendar, Eye, Hash, Info, Loader2, Mail, MapPin, Phone, UserCheck, UserPlus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDateForInput, mapVwoFormToUpdateDTO } from "./helpers/vwoForm.mapper";
import { vendorWorkOrderFormSchema, type VendorWorkOrderFormValues } from "./helpers/vwoForm.schema";

interface NewPartyForm {
  name: string;
  email: string;
  address: string;
  gstNo: string;
  pan: string;
  msme: string;
}

const defaultFormValues: VendorWorkOrderFormValues = {
  woDate: formatDateForInput(new Date()),
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
  selectedCertRecipient: "",
  shipToName: "",
  shippingAddress: "",
  shipToGst: "",
  shipToPan: "",
  products: [{ description: "", hsnSac: "", qty: null, rate: null, gstRate: 18 }],
  termsAndConditions: DEFAULT_VWO_TERMS_ROWS,
  scopeOfWork: [],
  accessoriesPackagingListAttachments: [],
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

function parseAttachments(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapVwoDataToFormValues(data: any): VendorWorkOrderFormValues {
  return {
    woDate: formatDateForInput(data.woDate) || formatDateForInput(new Date()),
    sellerId: data.sellerId ? String(data.sellerId) : "",
    sellerName: data.sellerName || "",
    sellerEmail: data.sellerEmail || "",
    sellerAddress: data.sellerAddress || "",
    sellerGstNo: data.sellerGstNo || "",
    sellerPanNo: data.sellerPanNo || "",
    sellerMsmeNo: data.sellerMsmeNo || "",
    sellerCinNo: data.sellerCinNo || "",
    contactPersonName: data.contactPersonName || "",
    contactPersonPhone: data.contactPersonPhone || "",
    contactPersonEmail: data.contactPersonEmail || "",
    partyId: data.shipToPartyId ? String(data.shipToPartyId) : "",
    selectedUserId: "",
    selectedCertRecipient: data.certRecipient ? String(data.certRecipient) : "",
    shipToName: data.shipToName || "",
    shippingAddress: data.shippingAddress || "",
    shipToGst: data.shipToGst || "",
    shipToPan: data.shipToPan || "",
    products: data.products?.length > 0
      ? data.products.map((p: any) => ({
          description: p.description || "",
          hsnSac: p.hsnSac || "",
          qty: p.qty ?? null,
          rate: p.rate ?? null,
          gstRate: p.gstRate ?? 18,
        }))
      : [{ description: "", hsnSac: "", qty: null, rate: null, gstRate: 18 }],
    termsAndConditions: data.termsAndConditions?.length > 0 ? data.termsAndConditions : DEFAULT_VWO_TERMS_ROWS,
    scopeOfWork: parseAttachments(data.scopeOfWork),
    accessoriesPackagingListAttachments: parseAttachments(data.accessoriesPackagingListAttachments),
    remarks: data.remarks || "",
  };
}

export default function EditVendorWorkOrderPage() {
  const navigate = useNavigate();
  const { projectId: projectIdParam, id: vwoIdParam } = useParams<{ projectId: string; id: string }>();
  const projectId = Number(projectIdParam);
  const vwoId = Number(vwoIdParam);

  const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
  const { data: partiesData } = usePoParties();
  const createPartyMutation = useCreatePoParty();

  const parties = partiesData || [];

  const [showPreview, setShowPreview] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);
  const [partyCreationType, setPartyCreationType] = useState<"seller" | "ship_to">("seller");
  const [newParty, setNewParty] = useState<NewPartyForm>({ name: "", email: "", address: "", gstNo: "", pan: "", msme: "" });
  const [vwoNumber, setVwoNumber] = useState<string>("");

  const { data: vwoData, isLoading: isVwoLoading } = useVendorWorkOrderDetails(vwoId);

  const form = useForm<VendorWorkOrderFormValues>({
    resolver: zodResolver(vendorWorkOrderFormSchema) as any,
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (vwoData) {
      const formValues = mapVwoDataToFormValues(vwoData);
      form.reset(formValues);
      setVwoNumber(vwoData.woNumber || "");
    }
  }, [vwoData, form]);

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
      .map((p: any) => ({ id: String(p.id), name: p.name })),
  ], [parties]);

  const partyOptions = useMemo(() => [
    ...(parties || [])
      .filter((p: any) => p.type === "ship_to")
      .map((p: any) => ({ id: String(p.id), name: p.name })),
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
      const partyData = {
        name: newParty.name,
        email: newParty.email || undefined,
        address: newParty.address || undefined,
        gstNo: newParty.gstNo || undefined,
        pan: newParty.pan || undefined,
        msme: newParty.msme || undefined,
        type: partyCreationType,
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

  const updateVWOMutation = useUpdateVendorWorkOrder();

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (values: VendorWorkOrderFormValues) => {
    try {
      const vwoData = mapVwoFormToUpdateDTO(values);
      await updateVWOMutation.mutateAsync({ id: vwoId, data: vwoData });
      toast.success(`WO has been updated successfully.`);
      navigate(paths.operations.projectDashboard(projectId));
    } catch {
      toast.error("Failed to update vendor work order. Please try again.");
    }
  };

  if (showPreview) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <VWOFormPreview
          formValues={form.getValues()}
          projectName={overview?.project?.projectName}
          nextWONumber={vwoNumber}
          isSubmitting={updateVWOMutation.isPending}
          onBack={() => setShowPreview(false)}
          onSubmit={form.handleSubmit(handleSubmit)}
          teamMembers={activeTeamMembers}
        />
      </div>
    );
  }

  if (isProjectLoading || isVwoLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <FormSkeleton />
      </div>
    );
  }

  if (!vwoData) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Vendor work order not found.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Vendor Work Order</CardTitle>
            <CardDescription className="mt-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {overview?.tender?.tenderNumber || "N/A"}
                </Badge>
                <Badge variant="secondary">
                  {overview?.project?.projectName || "N/A"}
                </Badge>
                <Badge variant="default">
                  {vwoNumber}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  WO Number
                </Label>
                <Input value={vwoNumber || "—"} readOnly className="bg-muted font-mono w-full" />
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
            </div>

            <div className="flex flex-col md:flex-row gap-6 mt-6">
              {/* ── Seller Information ── */}
              <div className="border rounded-lg border-primary border-dashed p-2 my-3 w-full md:w-1/2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Vendor Information
                  </h3>
                  <Dialog open={isAddPartyOpen} onOpenChange={(open) => { setIsAddPartyOpen(open); if (open) setPartyCreationType("seller"); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" type="button" onClick={() => setPartyCreationType("seller")}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add New Vendor
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
                {selectedSellerId && selectedSellerId !== "" && (
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
                )}
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

            {/* ── Cert Recipient ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
              <div className="space-y-1">
                <SelectField
                  control={form.control}
                  name="selectedCertRecipient"
                  label="Test Certificate Recipient"
                  options={activeTeamMembers.map((u: any) => ({ id: String(u.id), name: u.name }))}
                  placeholder="Select recipient for test certificate..."
                />
                <p className="text-xs text-muted-foreground">
                  Select the team member who should receive the test certificate and invoice via email
                </p>
              </div>
            </div>

            {/* ── Products ── */}
            <VWOProductsField control={form.control} />

            {/* ── Additional Details ── */}
            <div className="border rounded-lg border-secondary border-dashed p-4 space-y-6 mt-6">
              <VWOTermsField control={form.control} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <TenderFileUploader
                  label="Scope of Work"
                  context="tender-documents"
                  value={form.watch("scopeOfWork")}
                  onChange={(paths) => form.setValue("scopeOfWork", paths)}
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

            <div className="flex items-end justify-end">
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handlePreview} className="min-w-[160px]">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview & Update
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
        <DialogDescription>Add a new party to use as vendor or shipping destination.</DialogDescription>
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
