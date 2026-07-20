import SelectField from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, FileText, Info, Loader2, MapPin, Package, Save, ShoppingCart, Sparkles, UploadCloud, UserCheck } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { useCreateHrmsAsset, useHrmsAssetView, useUpdateHrmsAsset } from "@/hooks/api/useHrmsAssets";
import { useUsers } from "@/hooks/api/useUsers";
import { ACCESSORIES_LIST, ASSET_CATEGORY, ASSET_CONDITION, ASSET_LOCATION, ASSET_STATUS, ASSET_TYPE, toOptions } from "../constants";
import { createAssetSchema, editAssetSchema, type CreateAssetFormData, type EditAssetFormData } from "../helpers/asset.schema";
import { buildCreateFormData, buildEditFormData, getAssetFileUrl, toDateInput } from "../helpers/asset.mappers";
import { MOBILE_TYPES } from "../helpers/asset.types";

interface AssetFormProps {
  mode: "create" | "edit";
  assetId?: number;
}

const AnimatedCard: React.FC<{
  children: React.ReactNode;
  show: boolean;
  className?: string;
}> = ({ children, show, className }) => {
  return (
    <div
      className={cn(
        "grid transition-all duration-500 ease-out",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    "1": { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <UserCheck className="h-3 w-3" /> },
    "2": { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
    "3": { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <Loader2 className="h-3 w-3" /> },
    "4": { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: <Info className="h-3 w-3" /> },
    "5": { color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: <Info className="h-3 w-3" /> },
    "6": { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const config = statusConfig[status] || statusConfig["2"];
  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      {config.icon}
      {ASSET_STATUS[status]}
    </Badge>
  );
};

const FormField: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

const FilePreview: React.FC<{ label: string; url: string; onRemove: () => void }> = ({ label, url, onRemove }) => {
  const fileUrl = getAssetFileUrl(url);
  const filename = url.split("/").pop() || url;
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);

  return (
    <div className="border p-3 rounded space-y-2">
      <Label>{label}</Label>
      {isImage ? (
        <img src={fileUrl} className="h-24 w-full object-cover rounded" />
      ) : (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm">
          View File
        </a>
      )}
      <Button size="sm" variant="destructive" onClick={onRemove}>Remove</Button>
    </div>
  );
};

const AssetForm: React.FC<AssetFormProps> = ({ mode, assetId }) => {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: asset, isLoading: assetLoading } = useHrmsAssetView(mode === "edit" ? assetId : undefined);

  const createAssetMutation = useCreateHrmsAsset();
  const updateAssetMutation = useUpdateHrmsAsset();

  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState({
    purchaseInvoice: "",
    warrantyCard: "",
    assignmentForm: "",
    assetPhotos: [] as string[],
  });
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState({
    purchaseInvoice: null as File | null,
    warrantyCard: null as File | null,
    assignmentForm: null as File | null,
    assetPhotos: [] as File[],
  });

  const purchaseInvoiceRef = useRef<HTMLInputElement>(null);
  const warrantyCardRef = useRef<HTMLInputElement>(null);
  const assetPhotosRef = useRef<HTMLInputElement>(null);
  const assignmentFormRef = useRef<HTMLInputElement>(null);

  const schema = mode === "create" ? createAssetSchema : editAssetSchema;
  type FormData = mode extends "create" ? CreateAssetFormData : EditAssetFormData;

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: mode === "create"
      ? {
          assetType: "1",
          assetCategory: "1",
          assetCondition: "1",
          assetStatus: "2",
          accessories: [],
        }
      : undefined,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    control,
    reset,
  } = form;

  const watchAssetType = watch("assetType");
  const watchAssetStatus = watch("assetStatus");
  const isMobile = MOBILE_TYPES.includes(watchAssetType);
  const isAssigning = watchAssetStatus === "1";

  const isSubmittingForm = createAssetMutation.isPending || updateAssetMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && asset) {
      const formData: any = {
        userId: asset.userId ?? "",
        assetCode: asset.assetCode || "",
        assetType: asset.assetType || "",
        assetCategory: asset.assetCategory || "",
        brand: asset.brand || "",
        model: asset.model || "",
        specifications: asset.specifications || "",
        assetValue: asset.assetValue || "",
        assetCondition: asset.assetCondition || "",
        assignedDate: toDateInput(asset.assignedDate),
        purpose: asset.purpose || "",
        assetLocation: asset.assetLocation || "",
        serialNumber: asset.serialNumber || "",
        imeiNumber: asset.imeiNumber || "",
        licenseKey: asset.licenseKey || "",
        warrantyFrom: toDateInput(asset.warrantyFrom),
        warrantyTo: toDateInput(asset.warrantyTo),
        insuranceDetails: asset.insuranceDetails || "",
        assetStatus: asset.assetStatus || "",
        returnDate: toDateInput(asset.returnDate),
        returnCondition: asset.returnCondition || "",
        damageRemarks: asset.damageRemarks || "",
        deductionAmount: asset.deductionAmount || "",
        purchaseDate: toDateInput(asset.purchaseDate),
        purchasePrice: asset.purchasePrice || "",
        purchaseFrom: asset.purchaseFrom || "",
      };
      reset(formData);

      if (asset.accessories && Array.isArray(asset.accessories)) {
        setSelectedAccessories(asset.accessories);
        setValue("accessories", asset.accessories);
      }

      setExistingFiles({
        purchaseInvoice: asset.purchaseInvoiceUrl || "",
        warrantyCard: asset.warrantyCardUrl || "",
        assignmentForm: asset.assignmentFormUrl || "",
        assetPhotos: asset.assetPhotos || [],
      });
    }
  }, [asset, mode, reset, setValue]);

  const handleAssetTypeChange = (value: string) => {
    setValue("assetType", value);
    if (!MOBILE_TYPES.includes(value)) {
      setValue("imeiNumber", "");
      setValue("licenseKey", "");
    }
  };

  const handleStatusChange = (value: string) => {
    setValue("assetStatus", value);
    if (value === "1") {
      const currentAssignedDate = watch("assignedDate");
      if (!currentAssignedDate) {
        setValue("assignedDate", new Date().toISOString().split("T")[0]);
      }
    } else {
      setValue("userId", undefined);
      setValue("assignedDate", "");
      setValue("purpose", "");
      setValue("assetLocation", "");
    }
  };

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedAccessories, accessoryId]
      : selectedAccessories.filter((id) => id !== accessoryId);
    setSelectedAccessories(updated);
    setValue("accessories", updated);
  };

  const handleRemoveFile = (type: string) => {
    setRemovedFiles((prev) => [...prev, type]);
    setExistingFiles((prev) => ({ ...prev, [type]: "" }));
  };

  const handleRemovePhoto = (photo: string) => {
    setRemovedFiles((prev) => [...prev, photo]);
    setExistingFiles((prev) => ({
      ...prev,
      assetPhotos: prev.assetPhotos.filter((p) => p !== photo),
    }));
  };

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        const fileRefs = { purchaseInvoiceRef, warrantyCardRef, assetPhotosRef, assignmentFormRef };
        const formData = buildCreateFormData(data, fileRefs, selectedAccessories, currentUser?.id, isAssigning);
        await createAssetMutation.mutateAsync(formData);
        navigate(paths.hrms.assets.list);
      } else {
        const formData = buildEditFormData(data, removedFiles, newFiles, currentUser?.id);
        await updateAssetMutation.mutateAsync({ id: assetId!, data: formData });
        navigate(paths.hrms.assets.show(assetId!));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (mode === "edit" && assetLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (mode === "edit" && !asset) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Asset not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assets.list)}>
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl blur-xl" />
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {mode === "create"
                    ? isAssigning
                      ? "Assign Asset"
                      : "Add Asset to Inventory"
                    : `Edit Asset`}
                </h1>
                {mode === "create" && isAssigning && (
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                )}
              </div>
              <p className="text-muted-foreground">
                {mode === "create"
                  ? isAssigning
                    ? "Allocate physical hardware or software licenses to employees"
                    : "Register a new asset in the inventory system"
                  : `Update asset information for ${asset?.assetCode}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm gap-1.5 px-3 py-1.5">
            <Info className="h-3 w-3" />
            Fields marked with * are required
          </Badge>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Status Selection - Create mode only */}
          {mode === "create" && (
            <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-background to-muted/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  Asset Status
                </CardTitle>
                <CardDescription>
                  Select the initial status for this asset. Choose "Assigned" to allocate to an employee.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {toOptions(ASSET_STATUS).slice(0, 2).map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleStatusChange(status.value)}
                      disabled={isSubmittingForm}
                      className={cn(
                        "relative px-4 py-3 rounded-xl border-2 transition-all duration-300 ease-out",
                        "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
                        watchAssetStatus === status.value
                          ? "border-primary bg-primary/5 shadow-lg scale-105"
                          : "border-muted-foreground/20 hover:border-muted-foreground/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status.value} />
                      </div>
                      {watchAssetStatus === status.value && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping" />
                      )}
                    </button>
                  ))}
                </div>
                {errors.assetStatus && (
                  <p className="text-sm text-destructive mt-2">{errors.assetStatus.message as string}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 1: Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                Asset Information
              </CardTitle>
              <CardDescription>Primary identification and classification information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {mode === "edit" && (
                  <FormField label="Asset ID/Code" required error={errors.assetCode?.message as string}>
                    <Input
                      {...register("assetCode")}
                      placeholder="Auto-generated"
                      disabled
                      className="font-mono"
                    />
                  </FormField>
                )}
                <div className="space-y-2">
                  <Label htmlFor="assetType">
                    Asset Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    defaultValue={mode === "create" ? "1" : undefined}
                    value={mode === "edit" ? watchAssetType : undefined}
                    onValueChange={handleAssetTypeChange}
                    disabled={isSubmittingForm}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Asset Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {toOptions(ASSET_TYPE).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assetType && (
                    <p className="text-sm text-destructive">{errors.assetType.message as string}</p>
                  )}
                </div>

                {mode === "edit" ? (
                  <SelectField
                    control={control}
                    name="assetCategory"
                    label="Asset Category"
                    placeholder="Select Category"
                    options={toOptions(ASSET_CATEGORY)}
                  />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="assetCategory">
                      Asset Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      defaultValue="1"
                      onValueChange={(val) => setValue("assetCategory", val)}
                      disabled={isSubmittingForm}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {toOptions(ASSET_CATEGORY).map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.assetCategory && (
                      <p className="text-sm text-destructive">{errors.assetCategory.message as string}</p>
                    )}
                  </div>
                )}

                <FormField label="Brand/Manufacturer" required error={errors.brand?.message as string}>
                  <Input
                    {...register("brand")}
                    placeholder="e.g. Apple, Dell, HP"
                    disabled={isSubmittingForm}
                  />
                </FormField>

                <FormField label="Model" required error={errors.model?.message as string}>
                  <Input
                    {...register("model")}
                    placeholder="e.g. MacBook Pro 14-inch"
                    disabled={isSubmittingForm}
                  />
                </FormField>

                {mode === "edit" && (
                  <SelectField
                    control={control}
                    name="assetCondition"
                    label="Asset Condition"
                    placeholder="Select Condition"
                    options={toOptions(ASSET_CONDITION)}
                  />
                )}

                {mode === "edit" && (
                  <FormField label="Asset Value ($)" error={errors.assetValue?.message as string}>
                    <Input
                      {...register("assetValue")}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isSubmittingForm}
                    />
                  </FormField>
                )}
              </div>

              {mode === "create" && (
                <div className="space-y-2">
                  <Label htmlFor="assetCondition">
                    Asset Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    defaultValue="1"
                    onValueChange={(val) => setValue("assetCondition", val)}
                    disabled={isSubmittingForm}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {toOptions(ASSET_CONDITION).map((cond) => (
                        <SelectItem key={cond.value} value={cond.value}>
                          <Badge variant="secondary">{cond.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assetCondition && (
                    <p className="text-sm text-destructive">{errors.assetCondition.message as string}</p>
                  )}
                </div>
              )}

              {/* Specifications */}
              <div className="space-y-2">
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea
                  id="specifications"
                  {...register("specifications")}
                  placeholder="Enter detailed specifications (RAM, Storage, Processor, Screen Size, etc.)"
                  rows={3}
                  disabled={isSubmittingForm}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details - Conditional */}
          {mode === "create" && (
            <AnimatedCard show={isAssigning}>
              <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    Assignment Details
                    <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-600">
                      Assigning to Employee
                    </Badge>
                  </CardTitle>
                  <CardDescription>Information about who, when, and where the asset is assigned</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SelectField
                      control={control}
                      name="userId"
                      label={
                        <>
                          Assign To Employee <span className="text-red-500">*</span>
                        </>
                      }
                      options={users.map((u: any) => ({ id: String(u.id), name: u.name }))}
                      placeholder={usersLoading ? "Loading users..." : "Select employee"}
                      disabled={isSubmittingForm || usersLoading}
                    />
                    <div className="space-y-2">
                      <Label>Assigned By</Label>
                      <Input value={currentUser?.name ?? ""} disabled placeholder="Auto-filled from your account" className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedDate">
                        Assigned Date <span className="text-red-500">*</span>
                      </Label>
                      <Input type="date" id="assignedDate" {...register("assignedDate")} disabled={isSubmittingForm} />
                      {errors.assignedDate && (
                        <p className="text-sm text-destructive">{errors.assignedDate.message as string}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetLocation">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        Asset Location
                      </Label>
                      <Select onValueChange={(val) => setValue("assetLocation", val)} disabled={isSubmittingForm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                          {toOptions(ASSET_LOCATION).map((loc) => (
                            <SelectItem key={loc.value} value={loc.value}>
                              {loc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <Label htmlFor="purpose">Purpose of Assignment</Label>
                    <Textarea
                      id="purpose"
                      {...register("purpose")}
                      placeholder="Describe the purpose or reason for this asset assignment..."
                      rows={2}
                      disabled={isSubmittingForm}
                    />
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Purchase Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                Purchase Details
              </CardTitle>
              <CardDescription>Information about how and when this asset was purchased</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input type="date" id="purchaseDate" {...register("purchaseDate")} disabled={isSubmittingForm} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    {...register("purchasePrice")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmittingForm}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseFrom">Purchase From (Vendor)</Label>
                  <Input
                    id="purchaseFrom"
                    {...register("purchaseFrom")}
                    placeholder="Vendor name"
                    disabled={isSubmittingForm}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                Asset Identification
              </CardTitle>
              <CardDescription>Serial numbers, keys, and warranty information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    {...register("serialNumber")}
                    placeholder="Enter serial number"
                    className="font-mono"
                    disabled={isSubmittingForm}
                  />
                </div>
                <AnimatedCard show={isMobile} className="col-span-1">
                  <div className="space-y-2">
                    <Label htmlFor="imeiNumber">IMEI Number</Label>
                    <Input
                      id="imeiNumber"
                      {...register("imeiNumber")}
                      placeholder="15-digit IMEI"
                      className="font-mono"
                      disabled={isSubmittingForm || !isMobile}
                    />
                  </div>
                </AnimatedCard>
                <AnimatedCard show={isMobile} className="col-span-1">
                  <div className="space-y-2">
                    <Label htmlFor="licenseKey">License Key</Label>
                    <Input
                      id="licenseKey"
                      {...register("licenseKey")}
                      placeholder="For software licenses"
                      className="font-mono"
                      disabled={isSubmittingForm}
                    />
                  </div>
                </AnimatedCard>
                <div className="space-y-2">
                  <Label htmlFor="warrantyFrom">Warranty Period (From)</Label>
                  <Input type="date" id="warrantyFrom" {...register("warrantyFrom")} disabled={isSubmittingForm} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyTo">Warranty Period (To)</Label>
                  <Input type="date" id="warrantyTo" {...register("warrantyTo")} disabled={isSubmittingForm} />
                </div>
                {mode === "edit" && (
                  <div className="space-y-2">
                    <Label htmlFor="insuranceDetails">Insurance Details</Label>
                    <Input
                      id="insuranceDetails"
                      {...register("insuranceDetails")}
                      placeholder="Policy number or details"
                      disabled={isSubmittingForm}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Asset Accessories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                Asset Accessories
              </CardTitle>
              <CardDescription>Items included with the asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Accessories Included</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {ACCESSORIES_LIST.map((accessory) => (
                    <label
                      key={accessory.id}
                      className={cn(
                        "flex items-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all",
                        selectedAccessories.includes(accessory.id)
                          ? "border-primary bg-primary/5 shadow-md"
                          : "hover:bg-muted/50 hover:border-muted-foreground/30",
                      )}
                    >
                      <Checkbox
                        id={accessory.id}
                        checked={selectedAccessories.includes(accessory.id)}
                        onCheckedChange={(checked) => handleAccessoryChange(accessory.id, checked as boolean)}
                        disabled={isSubmittingForm}
                      />
                      <span className="text-sm font-normal cursor-pointer flex-1">{accessory.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessoryDetails">Additional Accessory Details</Label>
                <Textarea
                  id="accessoryDetails"
                  {...register("accessoryDetails")}
                  placeholder="Describe any additional accessories or details about the included items..."
                  rows={2}
                  disabled={isSubmittingForm}
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents & Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <UploadCloud className="h-5 w-5 text-cyan-600" />
                </div>
                Documents & Attachments
              </CardTitle>
              <CardDescription>Attach invoices, warranties, photos, and signed forms</CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "edit" && (
                <div className="space-y-4 mb-6">
                  <Label className="text-base font-semibold">Existing Documents</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {existingFiles.purchaseInvoice && (
                      <FilePreview label="Purchase Invoice" url={existingFiles.purchaseInvoice} onRemove={() => handleRemoveFile("purchaseInvoice")} />
                    )}
                    {existingFiles.warrantyCard && (
                      <FilePreview label="Warranty Card" url={existingFiles.warrantyCard} onRemove={() => handleRemoveFile("warrantyCard")} />
                    )}
                    {existingFiles.assignmentForm && (
                      <FilePreview label="Assignment Form" url={existingFiles.assignmentForm} onRemove={() => handleRemoveFile("assignmentForm")} />
                    )}
                    {!existingFiles.purchaseInvoice && !existingFiles.warrantyCard && !existingFiles.assignmentForm && (
                      <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                    )}
                  </div>

                  {existingFiles.assetPhotos.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Asset Photos</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingFiles.assetPhotos.map((photo, i) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden border">
                            <img src={getAssetFileUrl(photo)} className="h-32 w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Button size="sm" variant="destructive" onClick={() => handleRemovePhoto(photo)}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { ref: purchaseInvoiceRef, id: "purchaseInvoice", label: "Purchase Invoice", desc: "Attach original billing PDF or image", accept: ".pdf,image/*" },
                  { ref: warrantyCardRef, id: "warrantyCard", label: "Warranty Card", desc: "Attach warranty documentation", accept: ".pdf,image/*" },
                  { ref: assetPhotosRef, id: "assetPhotos", label: "Asset Photos", desc: "Upload photos of the asset (up to 5 images)", accept: "image/*", multiple: true },
                  { ref: assignmentFormRef, id: "assignmentForm", label: "Signed Assignment Form", desc: "Upload signed handover agreement", accept: ".pdf,image/*" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="group relative border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all border-muted-foreground/20 bg-muted/10"
                  >
                    <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
                    <Label htmlFor={item.id} className="cursor-pointer font-medium mb-1 block group-hover:text-primary transition-colors">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
                    <Input
                      id={item.id}
                      ref={item.ref as React.RefObject<HTMLInputElement>}
                      type="file"
                      accept={item.accept}
                      multiple={item.multiple}
                      disabled={isSubmittingForm}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* General Remarks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                General Remarks
              </CardTitle>
              <CardDescription>Any additional notes or observations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="remarks"
                {...register("remarks")}
                placeholder="Enter any additional remarks, notes, or observations..."
                rows={4}
                disabled={isSubmittingForm}
              />
            </CardContent>
          </Card>

          <Separator className="my-8" />

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 pb-8">
            <p className="text-sm text-muted-foreground">Review all information before submitting</p>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmittingForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingForm}
                className={cn("min-w-48", mode === "create" && isAssigning && "bg-emerald-600 hover:bg-emerald-700")}
              >
                {isSubmittingForm ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "create" ? (isAssigning ? "Assigning Asset..." : "Adding to Inventory...") : "Saving Changes..."}
                  </>
                ) : (
                  <>
                    {mode === "create" ? (
                      isAssigning ? (
                        <><UserCheck className="mr-2 h-4 w-4" /> Complete Assignment</>
                      ) : (
                        <><Package className="mr-2 h-4 w-4" /> Add to Inventory</>
                      )
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AssetForm;
