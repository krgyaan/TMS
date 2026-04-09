import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SelectField from "@/components/form/SelectField";
import { Form } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  UploadCloud,
  Package,
  Info,
  ShoppingCart,
  UserCheck,
  MapPin,
  FileText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import { useUsers } from "@/hooks/api/useUsers";
import { useCreateHrmsAsset } from "@/hooks/api/useHrmsAssets";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { toOptions, ASSET_TYPE, ASSET_CATEGORY, ASSET_CONDITION, ASSET_LOCATION, ASSET_STATUS, ACCESSORIES_LIST } from "./constants";
import { paths } from "@/app/routes/paths";

// Updated schema with conditional validation for assignment fields
const assetSchema = z.object({
  // Asset Information
  assetType: z.string().min(1, "Asset Type is required"),
  assetCategory: z.string().min(1, "Asset Category is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  specifications: z.string().optional(),
  assetValue: z.string().optional(),
  assetCondition: z.string().min(1, "Asset Condition is required"),

  // Purchase Details
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.string().optional(),
  purchaseFrom: z.string().optional(),

  // Assignment Details (conditional)
  userId: z.number().optional(),
  assignedDate: z.string().optional().or(z.literal("")),
  expectedReturnDate: z.string().optional().or(z.literal("")),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),

  // Asset Identification
  serialNumber: z.string().optional(),
  imeiNumber: z.string().optional(),
  licenseKey: z.string().optional(),
  warrantyFrom: z.string().optional().or(z.literal("")),
  warrantyTo: z.string().optional().or(z.literal("")),
  insuranceDetails: z.string().optional(),

  // Asset Accessories
  accessories: z.array(z.string()).optional(),
  accessoryDetails: z.string().optional(),

  // Asset Status
  assetStatus: z.string().min(1, "Current Status is required"),

  // General Remarks
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
  // If status is "Assigned" (1), userId and assignedDate are required
  if (data.assetStatus === "1") {
    if (!data.userId || data.userId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee is required when assigning an asset",
        path: ["userId"],
      });
    }
    if (!data.assignedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assignment date is required when assigning an asset",
        path: ["assignedDate"],
      });
    }
  }
});

type AssetFormData = z.infer<typeof assetSchema>;

const MOBILE_TYPES = ["3", "11"]; // Mobile, SIM Card

// Animation wrapper component
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
        className
      )}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// Status badge with icon
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    "1": { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <UserCheck className="h-3 w-3" /> },
    "2": { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
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

const AssetAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const createAssetMutation = useCreateHrmsAsset();
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);

  // File input refs
  const purchaseInvoiceRef = useRef<HTMLInputElement>(null);
  const warrantyCardRef = useRef<HTMLInputElement>(null);
  const assetPhotosRef = useRef<HTMLInputElement>(null);
  const assignmentFormRef = useRef<HTMLInputElement>(null);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetType: "1", // Laptop
      assetCategory: "1", // IT Equipment
      assetCondition: "1", // New
      assetStatus: "2", // Available (changed from Assigned)
      accessories: [],
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = form;

  const watchAssetType = watch("assetType");
  const watchAssetStatus = watch("assetStatus");
  const isMobile = MOBILE_TYPES.includes(watchAssetType);
  const isAssigning = watchAssetStatus === "1"; // Check if status is "Assigned"

  const isSubmitting = createAssetMutation.isPending;

  const handleAssetTypeChange = (value: string) => {
    setValue("assetType", value);
    if (!MOBILE_TYPES.includes(value)) {
      setValue("imeiNumber", "");
      setValue("licenseKey", "");
    }
  };

  const handleStatusChange = (value: string) => {
    setValue("assetStatus", value);
    // If switching to Assigned, set default assigned date
    if (value === "1") {
      setValue("assignedDate", new Date().toISOString().split("T")[0]);
    } else {
      // Clear assignment fields when not assigning
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

  const onSubmit = async (data: AssetFormData) => {
    try {
      const formData = new FormData();

      (Object.keys(data) as (keyof AssetFormData)[]).forEach((key) => {
        const val = data[key];
        if (val === undefined || val === null || val === "") return;
        if (key === "accessories") return;
        formData.append(key, String(val));
      });

      formData.append("accessories", JSON.stringify(selectedAccessories));

      if (currentUser?.id && isAssigning) {
        formData.append("assignedBy", String(currentUser.id));
      }

      const purchaseInvoice = purchaseInvoiceRef.current?.files?.[0];
      if (purchaseInvoice) formData.append("purchaseInvoice", purchaseInvoice);

      const warrantyCard = warrantyCardRef.current?.files?.[0];
      if (warrantyCard) formData.append("warrantyCard", warrantyCard);

      const assignmentForm = assignmentFormRef.current?.files?.[0];
      if (assignmentForm) formData.append("assignmentForm", assignmentForm);

      const assetPhotos = assetPhotosRef.current?.files;
      if (assetPhotos) {
        Array.from(assetPhotos).forEach((photo) =>
          formData.append("assetPhotos", photo)
        );
      }

      await createAssetMutation.mutateAsync(formData);
      navigate(paths.hrms.assetAdminDashboard);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header with gradient accent */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl blur-xl" />
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(paths.hrms.assetAdminDashboard)}
              className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isAssigning ? "Assign Asset" : "Add Asset to Inventory"}
                </h1>
                {isAssigning && (
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                )}
              </div>
              <p className="text-muted-foreground">
                {isAssigning 
                  ? "Allocate physical hardware or software licenses to employees"
                  : "Register a new asset in the inventory system"
                }
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
        {/* Status Selection Card - Now prominent at top */}
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
              {toOptions(ASSET_STATUS).map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleStatusChange(status.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "relative px-4 py-3 rounded-xl border-2 transition-all duration-300 ease-out",
                    "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
                    watchAssetStatus === status.value
                      ? "border-primary bg-primary/5 shadow-lg scale-105"
                      : "border-muted-foreground/20 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status.value} />
                  </div>
                  {watchAssetStatus === status.value && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping" />
                  )}
                  {watchAssetStatus === status.value && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
            {errors.assetStatus && (
              <p className="text-sm text-destructive mt-2">{errors.assetStatus.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Section 1: Asset Information */}
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              Asset Information
            </CardTitle>
            <CardDescription>
              Primary identification and classification information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Asset Type */}
              <div className="space-y-2">
                <Label htmlFor="assetType">
                  Asset Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="1"
                  onValueChange={handleAssetTypeChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Select Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {toOptions(ASSET_TYPE).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assetType && (
                  <p className="text-sm text-destructive">{errors.assetType.message}</p>
                )}
              </div>

              {/* Asset Category */}
              <div className="space-y-2">
                <Label htmlFor="assetCategory">
                  Asset Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="1"
                  onValueChange={(val) => setValue("assetCategory", val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
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
                  <p className="text-sm text-destructive">{errors.assetCategory.message}</p>
                )}
              </div>

              {/* Brand */}
              <div className="space-y-2">
                <Label htmlFor="brand">
                  Brand/Manufacturer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brand"
                  {...register("brand")}
                  placeholder="e.g. Apple, Dell, HP"
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50 focus:scale-[1.02]"
                />
                {errors.brand && (
                  <p className="text-sm text-destructive">{errors.brand.message}</p>
                )}
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">
                  Model <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model"
                  {...register("model")}
                  placeholder="e.g. MacBook Pro 14-inch"
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50 focus:scale-[1.02]"
                />
                {errors.model && (
                  <p className="text-sm text-destructive">{errors.model.message}</p>
                )}
              </div>

              {/* Asset Condition */}
              <div className="space-y-2">
                <Label htmlFor="assetCondition">
                  Asset Condition <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="1"
                  onValueChange={(val) => setValue("assetCondition", val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Select Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {toOptions(ASSET_CONDITION).map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        <Badge variant="secondary">
                          {cond.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assetCondition && (
                  <p className="text-sm text-destructive">{errors.assetCondition.message}</p>
                )}
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                {...register("specifications")}
                placeholder="Enter detailed specifications (RAM, Storage, Processor, Screen Size, etc.)"
                rows={3}
                disabled={isSubmitting}
                className="transition-all duration-200 hover:border-primary/50 focus:scale-[1.01]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Purchase Details */}
        <Card className="transition-all duration-300 hover:shadow-md">
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
              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  type="date"
                  id="purchaseDate"
                  {...register("purchaseDate")}
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50"
                />
              </div>

              {/* Purchase Price */}
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price (₹)</Label>
                <Input
                  id="purchasePrice"
                  {...register("purchasePrice")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50"
                />
              </div>

              {/* Purchase From (Vendor) */}
              <div className="space-y-2">
                <Label htmlFor="purchaseFrom">Purchase From (Vendor)</Label>
                <Input
                  id="purchaseFrom"
                  {...register("purchaseFrom")}
                  placeholder="e.g. TechAlly, Optimist"
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Assignment Details - Conditionally Rendered */}
        <AnimatedCard show={isAssigning}>
          <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 animate-pulse">
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
                {/* Assign To Employee */}
                <SelectField
                  control={control}
                  name="userId"
                  label={
                    <>
                      Assign To Employee <span className="text-red-500">*</span>
                    </>
                  }
                  options={users.map((u) => ({ id: String(u.id), name: u.name }))}
                  placeholder={usersLoading ? "Loading users..." : "Select employee"}
                  disabled={isSubmitting || usersLoading}
                />

                {/* Assigned By – auto-filled from logged-in user */}
                <div className="space-y-2">
                  <Label>Assigned By</Label>
                  <Input
                    value={currentUser?.name ?? ""}
                    disabled
                    placeholder="Auto-filled from your account"
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Automatically set to your account</p>
                </div>

                {/* Assigned Date */}
                <div className="space-y-2">
                  <Label htmlFor="assignedDate">
                    Assigned Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="assignedDate"
                    {...register("assignedDate")}
                    disabled={isSubmitting}
                    className="transition-all duration-200 hover:border-emerald-500/50"
                  />
                  {errors.assignedDate && (
                    <p className="text-sm text-destructive">{errors.assignedDate.message}</p>
                  )}
                </div>

                {/* Asset Location */}
                <div className="space-y-2">
                  <Label htmlFor="assetLocation">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Asset Location
                  </Label>
                  <Select
                    onValueChange={(val) => setValue("assetLocation", val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="transition-all duration-200 hover:border-emerald-500/50">
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

              {/* Purpose */}
              <div className="space-y-2 mt-6">
                <Label htmlFor="purpose">Purpose of Assignment</Label>
                <Textarea
                  id="purpose"
                  {...register("purpose")}
                  placeholder="Describe the purpose or reason for this asset assignment..."
                  rows={2}
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-emerald-500/50"
                />
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Section 4: Asset Identification */}
        <Card className="transition-all duration-300 hover:shadow-md">
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
              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  {...register("serialNumber")}
                  placeholder="Enter serial number"
                  className="font-mono transition-all duration-200 hover:border-primary/50"
                  disabled={isSubmitting}
                />
              </div>

              {/* IMEI Number – Mobile only */}
              <AnimatedCard show={isMobile} className="col-span-1">
                <div className="space-y-2">
                  <Label htmlFor="imeiNumber">IMEI Number</Label>
                  <Input
                    id="imeiNumber"
                    {...register("imeiNumber")}
                    placeholder="15-digit IMEI"
                    className="font-mono transition-all duration-200 hover:border-primary/50"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">Required for mobile devices</p>
                </div>
              </AnimatedCard>

              {/* License Key – Mobile only */}
              <AnimatedCard show={isMobile} className="col-span-1">
                <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input
                    id="licenseKey"
                    {...register("licenseKey")}
                    placeholder="For software licenses"
                    className="font-mono transition-all duration-200 hover:border-primary/50"
                    disabled={isSubmitting}
                  />
                </div>
              </AnimatedCard>

              {/* Warranty From */}
              <div className="space-y-2">
                <Label htmlFor="warrantyFrom">Warranty Period (From)</Label>
                <Input
                  type="date"
                  id="warrantyFrom"
                  {...register("warrantyFrom")}
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50"
                />
              </div>

              {/* Warranty To */}
              <div className="space-y-2">
                <Label htmlFor="warrantyTo">Warranty Period (To)</Label>
                <Input
                  type="date"
                  id="warrantyTo"
                  {...register("warrantyTo")}
                  disabled={isSubmitting}
                  className="transition-all duration-200 hover:border-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Asset Accessories */}
        <Card className="transition-all duration-300 hover:shadow-md">
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
                {ACCESSORIES_LIST.map((accessory, index) => (
                  <label
                    key={accessory.id}
                    className={cn(
                      "flex items-center space-x-2 border rounded-xl p-3 cursor-pointer",
                      "transition-all duration-300 ease-out hover:scale-105",
                      selectedAccessories.includes(accessory.id)
                        ? "border-primary bg-primary/5 shadow-md"
                        : "hover:bg-muted/50 hover:border-muted-foreground/30"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      id={accessory.id}
                      checked={selectedAccessories.includes(accessory.id)}
                      onCheckedChange={(checked) =>
                        handleAccessoryChange(accessory.id, checked as boolean)
                      }
                      disabled={isSubmitting}
                    />
                    <span className="text-sm font-normal cursor-pointer flex-1">
                      {accessory.label}
                    </span>
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
                disabled={isSubmitting}
                className="transition-all duration-200 hover:border-primary/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Documents & Attachments */}
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <UploadCloud className="h-5 w-5 text-cyan-600" />
              </div>
              Documents & Attachments
            </CardTitle>
            <CardDescription>
              Attach invoices, warranties, photos, and signed forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { ref: purchaseInvoiceRef, id: "purchaseInvoice", label: "Purchase Invoice", desc: "Attach original billing PDF or image", accept: ".pdf,image/*" },
                { ref: warrantyCardRef, id: "warrantyCard", label: "Warranty Card", desc: "Attach warranty documentation", accept: ".pdf,image/*" },
                { ref: assetPhotosRef, id: "assetPhotos", label: "Asset Photos", desc: "Upload photos of the asset (up to 5 images)", accept: "image/*", multiple: true },
                { ref: assignmentFormRef, id: "assignmentForm", label: "Signed Assignment Form", desc: "Upload signed handover agreement", accept: ".pdf,image/*" },
              ].map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative border-2 border-dashed rounded-xl p-6 text-center",
                    "transition-all duration-300 ease-out",
                    "hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]",
                    "border-muted-foreground/20 bg-muted/10"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors duration-300" />
                  <Label
                    htmlFor={item.id}
                    className="cursor-pointer font-medium mb-1 block group-hover:text-primary transition-colors duration-300"
                  >
                    {item.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    {item.desc}
                  </p>
                  <Input
                    id={item.id}
                    ref={item.ref as React.RefObject<HTMLInputElement>}
                    type="file"
                    accept={item.accept}
                    multiple={item.multiple}
                    disabled={isSubmitting}
                    className="max-w-xs mx-auto"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 7: General Remarks */}
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              General Remarks
            </CardTitle>
            <CardDescription>Any additional notes or observations about this asset or assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="remarks"
              {...register("remarks")}
              placeholder="Enter any additional remarks, notes, or observations..."
              rows={4}
              disabled={isSubmitting}
              className="transition-all duration-200 hover:border-primary/50"
            />
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <p className="text-sm text-muted-foreground">
            Review all information before submitting
          </p>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(paths.hrms.assetAdminDashboard)}
              disabled={isSubmitting}
              className="transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className={cn(
                "min-w-48 transition-all duration-300",
                "hover:scale-105 hover:shadow-lg",
                isAssigning && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAssigning ? "Assigning Asset..." : "Adding to Inventory..."}
                </>
              ) : (
                <>
                  {isAssigning ? (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Complete Assignment
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Add to Inventory
                    </>
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

export default AssetAssignment;