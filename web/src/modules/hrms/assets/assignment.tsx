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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  UploadCloud, 
  Package,
  Info,
  ShoppingCart,
} from "lucide-react";

import { useUsers } from "@/hooks/api/useUsers";
import { useCreateHrmsAsset } from "@/hooks/api/useHrmsAssets";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { toOptions, toValue, ASSET_TYPE, ASSET_CATEGORY, ASSET_CONDITION, ASSET_LOCATION, ASSET_STATUS, ACCESSORIES_LIST } from "./constants";
import { paths } from "@/app/routes/paths";


const assetSchema = z.object({
  // Asset Information
  userId: z.number().positive("Employee is required"),
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

  // Assignment Details
  assignedDate: z.string().min(1, "Assignment date is required"),
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
});

type AssetFormData = z.infer<typeof assetSchema>;

const MOBILE_TYPES = ["3", "11"];  // Mobile, SIM Card

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
      defaultValues: {
        assetType: "1",     // Laptop
        assetCategory: "1", // IT Equipment
        assetCondition: "1", // New
        assetStatus: "1",   // Assigned
        assignedDate: new Date().toISOString().split("T")[0],
        accessories: [],
      }
  });

  const watchAssetType = watch("assetType");
  const isMobile = MOBILE_TYPES.includes(watchAssetType);

  const isSubmitting = createAssetMutation.isPending;

  const handleAssetTypeChange = (value: string) => {
    setValue("assetType", value);
    // Clear IMEI/license key if switching away from mobile
    if (!MOBILE_TYPES.includes(value)) {
      setValue("imeiNumber", "");
      setValue("licenseKey", "");
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

      // Append all scalar fields from validated data
      (Object.keys(data) as (keyof AssetFormData)[]).forEach((key) => {
        const val = data[key];
        if (val === undefined || val === null || val === "") return;
        if (key === "accessories") return; // handled separately below
        formData.append(key, String(val));
      });

      // Accessories as JSON string (backend will JSON.parse it)
      formData.append("accessories", JSON.stringify(selectedAccessories));

      // Auto-fill assignedBy with logged-in user's ID
      if (currentUser?.id) {
        formData.append("assignedBy", String(currentUser.id));
      }

      // Append file inputs
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(paths.hrms.assetAdminDashboard)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assign Asset</h1>
            <p className="text-muted-foreground">
              Allocate physical hardware or software licenses to employees
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          <Info className="h-3 w-3 mr-1" />
          Fields marked with * are required
        </Badge>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Asset Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
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
                  <SelectTrigger>
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
                />
                {errors.model && (
                  <p className="text-sm text-destructive">{errors.model.message}</p>
                )}
              </div>

              {/* Asset Value */}
              {/* <div className="space-y-2">
                <Label htmlFor="assetValue">Asset Value (₹)</Label>
                <Input
                  id="assetValue"
                  {...register("assetValue")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div> */}

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
                  <SelectTrigger>
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Purchase Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Assignment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Information about who, when, and where the asset is assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Assign To Employee */}
              <div className="space-y-2">
                <Label htmlFor="userId">
                  Assign To Employee <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue("userId", Number(value))}
                  disabled={isSubmitting || usersLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={usersLoading ? "Loading users..." : "Select employee"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        <div className="flex flex-col">
                          <span>{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.userId && (
                  <p className="text-sm text-destructive">{errors.userId.message}</p>
                )}
              </div>

              {/* Assigned By – auto-filled from logged-in user (display only) */}
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
                />
                {errors.assignedDate && (
                  <p className="text-sm text-destructive">{errors.assignedDate.message}</p>
                )}
              </div>

              {/* Expected Return Date */}
              {/* <div className="space-y-2">
                <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                <Input
                  type="date"
                  id="expectedReturnDate"
                  {...register("expectedReturnDate")}
                  disabled={isSubmitting}
                />
              </div> */}

              {/* Asset Location */}
              <div className="space-y-2">
                <Label htmlFor="assetLocation">Asset Location</Label>
                <Select
                  onValueChange={(val) => setValue("assetLocation", val)}
                  disabled={isSubmitting}
                >
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

              {/* Current Status */}
              <div className="space-y-2">
                <Label htmlFor="assetStatus">
                  Current Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="1"
                  onValueChange={(val) => setValue("assetStatus", val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {toOptions(ASSET_STATUS).map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assetStatus && (
                  <p className="text-sm text-destructive">{errors.assetStatus.message}</p>
                )}
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Asset Identification */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Identification</CardTitle>
            <CardDescription>Serial numbers, keys, and warranty information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Serial Number (optional) */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  {...register("serialNumber")}
                  placeholder="Enter serial number"
                  className="font-mono"
                  disabled={isSubmitting}
                />
              </div>

              {/* IMEI Number – Mobile only */}
              {isMobile && (
                <div className="space-y-2">
                  <Label htmlFor="imeiNumber">IMEI Number</Label>
                  <Input
                    id="imeiNumber"
                    {...register("imeiNumber")}
                    placeholder="15-digit IMEI"
                    className="font-mono"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">Required for mobile devices</p>
                </div>
              )}

              {/* License Key – Mobile only */}
              {isMobile && (
                <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input
                    id="licenseKey"
                    {...register("licenseKey")}
                    placeholder="For software licenses"
                    className="font-mono"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Warranty From */}
              <div className="space-y-2">
                <Label htmlFor="warrantyFrom">Warranty Period (From)</Label>
                <Input
                  type="date"
                  id="warrantyFrom"
                  {...register("warrantyFrom")}
                  disabled={isSubmitting}
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
                />
              </div>

              {/* Insurance Details */}
              {/* <div className="space-y-2">
                <Label htmlFor="insuranceDetails">Insurance Details</Label>
                <Input
                  id="insuranceDetails"
                  {...register("insuranceDetails")}
                  placeholder="Policy number or details"
                  disabled={isSubmitting}
                />
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Asset Accessories */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Accessories</CardTitle>
            <CardDescription>Items included with the asset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Accessories Included</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {ACCESSORIES_LIST.map((accessory) => (
                  <div
                    key={accessory.id}
                    className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={accessory.id}
                      checked={selectedAccessories.includes(accessory.id)}
                      onCheckedChange={(checked) =>
                        handleAccessoryChange(accessory.id, checked as boolean)
                      }
                      disabled={isSubmitting}
                    />
                    <Label
                      htmlFor={accessory.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {accessory.label}
                    </Label>
                  </div>
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Documents & Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Documents & Attachments</CardTitle>
            <CardDescription>
              Attach invoices, warranties, photos, and signed forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purchase Invoice */}
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <Label
                  htmlFor="purchaseInvoice"
                  className="cursor-pointer font-medium mb-1 block"
                >
                  Purchase Invoice
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Attach original billing PDF or image
                </p>
                <Input
                  id="purchaseInvoice"
                  ref={purchaseInvoiceRef}
                  type="file"
                  accept=".pdf,image/*"
                  disabled={isSubmitting}
                  className="max-w-xs mx-auto"
                />
              </div>

              {/* Warranty Card */}
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <Label
                  htmlFor="warrantyCard"
                  className="cursor-pointer font-medium mb-1 block"
                >
                  Warranty Card
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Attach warranty documentation
                </p>
                <Input
                  id="warrantyCard"
                  ref={warrantyCardRef}
                  type="file"
                  accept=".pdf,image/*"
                  disabled={isSubmitting}
                  className="max-w-xs mx-auto"
                />
              </div>

              {/* Asset Photos */}
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <Label
                  htmlFor="assetPhotos"
                  className="cursor-pointer font-medium mb-1 block"
                >
                  Asset Photos
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload photos of the asset (up to 5 images)
                </p>
                <Input
                  id="assetPhotos"
                  ref={assetPhotosRef}
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isSubmitting}
                  className="max-w-xs mx-auto"
                />
              </div>

              {/* Signed Assignment Form */}
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <Label
                  htmlFor="assignmentForm"
                  className="cursor-pointer font-medium mb-1 block"
                >
                  Signed Assignment Form
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload signed handover agreement
                </p>
                <Input
                  id="assignmentForm"
                  ref={assignmentFormRef}
                  type="file"
                  accept=".pdf,image/*"
                  disabled={isSubmitting}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: General Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>General Remarks</CardTitle>
            <CardDescription>Any additional notes or observations about this asset or assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="remarks"
              {...register("remarks")}
              placeholder="Enter any additional remarks, notes, or observations..."
              rows={4}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Review all information before submitting
          </p>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(paths.hrms.assetAdminDashboard)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-48">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning Asset...
                </>
              ) : (
                "Complete Assignment"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssetAssignment;