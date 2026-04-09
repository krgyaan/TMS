// src/pages/hrms/assets/AssetStatus.tsx
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  User,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Package,
  ArrowLeft,
  Save,
  DollarSign,
  Clock,
  Info,
  AlertCircle,
  RotateCcw,
  History,
  FileWarning,
  Shield,
  Building,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import { useUsers } from "@/hooks/api/useUsers";
import {
  useHrmsAssetView,
  useHrmsAssetDetails,
  useHrmsAssetHistory,
  useUpdateHrmsAssetStatus,
} from "@/hooks/api/useHrmsAssets";
import { paths } from "@/app/routes/paths";
import {
  ASSET_STATUS_KEYS,
  ASSET_CONDITION,
  ASSET_LOCATION,
  DAMAGE_TYPE,
  toOptions,
} from "./constants";

// ─── Status Configuration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  icon: React.ElementType;
  description: string;
}> = {
  "1": {
    label: "Assigned",
    badgeClass: "bg-green-800 text-green-100 hover:bg-green-800",
    icon: User,
    description: "Asset is assigned to an employee",
  },
  "2": {
    label: "Available",
    badgeClass: "bg-blue-800 text-blue-100 hover:bg-blue-800",
    icon: Package,
    description: "Asset is available for assignment",
  },
  "3": {
    label: "Under Repair",
    badgeClass: "bg-yellow-800 text-yellow-100 hover:bg-yellow-800",
    icon: Wrench,
    description: "Asset is being repaired",
  },
  "4": {
    label: "Damaged",
    badgeClass: "bg-red-800 text-red-100 hover:bg-red-800",
    icon: AlertTriangle,
    description: "Asset has been damaged",
  },
  "5": {
    label: "Lost",
    badgeClass: "bg-red-800 text-red-100 hover:bg-red-800",
    icon: XCircle,
    description: "Asset has been lost",
  },
  "6": {
    label: "Returned",
    badgeClass: "bg-gray-800 text-gray-100 hover:bg-gray-800",
    icon: RotateCcw,
    description: "Asset has been returned",
  },
};


// ─── Utils ───────────────────────────────────────────────────────────────────

const sanitizePayload = (data: any) => {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      // Convert empty string → null
      if (value === "") return [key, null];

      // Convert numeric fields properly
      if (["repairEstimatedCost", "deductionAmount"].includes(key)) {
        return [key, value !== null && value !== undefined ? Number(value) : null];
      }

      return [key, value];
    })
  );
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const emptyToNull = (val: any) => (val === "" ? null : val);

const schema = z.object({
  assetStatus: z.string().min(1, "Status is required"),

  // Assignment
  userId: z.coerce.number().optional(),
  assignedDate: z.string().optional().transform(emptyToNull),
  purpose: z.string().optional().transform(emptyToNull),
  assetLocation: z.string().optional().transform(emptyToNull),

  // Return
  returnDate: z.string().optional().transform(emptyToNull),
  returnCondition: z.string().optional().transform(emptyToNull),
  assetCondition: z.string().optional().transform(emptyToNull),

  // Damage
  damageDate: z.string().optional().transform(emptyToNull),
  damageType: z.string().optional().transform(emptyToNull),
  damageDescription: z.string().optional().transform(emptyToNull),
  isRepairable: z.string().optional().transform(emptyToNull),

  // Loss
  lostDate: z.string().optional().transform(emptyToNull),
  lostLocation: z.string().optional().transform(emptyToNull),
  lostCircumstances: z.string().optional().transform(emptyToNull),
  policeReportNumber: z.string().optional().transform(emptyToNull),
  policeReportDate: z.string().optional().transform(emptyToNull),

  // Repair
  repairStartDate: z.string().optional().transform(emptyToNull),
  repairEndDate: z.string().optional().transform(emptyToNull),
  repairEstimatedCost: z.string().optional().transform(emptyToNull),
  repairVendor: z.string().optional().transform(emptyToNull),
  repairDescription: z.string().optional().transform(emptyToNull),

  // Financial
  deductionAmount: z.string().optional().transform(emptyToNull),
  deductionReason: z.string().optional().transform(emptyToNull),

  // General
  remarks: z.string().optional().transform(emptyToNull),
});

type FormData = z.infer<typeof schema>;

// ─── Sub Components ───────────────────────────────────────────────────────────

const StatusCard: React.FC<{
  value: string;
  selected: boolean;
  onClick: () => void;
  currentStatus?: string;
}> = ({ value, selected, onClick, currentStatus }) => {
  const config = STATUS_CONFIG[value];
  const Icon = config.icon;
  const isCurrent = currentStatus === value;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200",
        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
        selected
          ? "border-primary bg-muted/50 shadow-sm"
          : "border-border hover:border-muted-foreground/30",
      )}
    >
      {isCurrent && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
          Current
        </Badge>
      )}
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
          selected ? "bg-primary" : "bg-muted"
        )}
      >
        <Icon className={cn("w-6 h-6", selected ? "text-primary-foreground" : "text-muted-foreground")} />
      </div>
      <span className={cn("text-sm font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
        {config.label}
      </span>
      {selected && (
        <div className="absolute top-2 left-2">
          <CheckCircle className="w-4 h-4 text-primary" />
        </div>
      )}
    </button>
  );
};

const InfoBox: React.FC<{
  type: "info" | "warning" | "error" | "success";
  title: string;
  children: React.ReactNode;
}> = ({ type, title, children }) => {
  const configs = {
    info: { icon: Info, iconColor: "text-blue-600" },
    warning: { icon: AlertCircle, iconColor: "text-yellow-600" },
    error: { icon: AlertTriangle, iconColor: "text-red-600" },
    success: { icon: CheckCircle2, iconColor: "text-green-600" },
  };
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border p-4 bg-muted/50">
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.iconColor)} />
        <div>
          <h4 className="font-medium text-foreground">{title}</h4>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
};

const FormSection: React.FC<{
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, children, className }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const FormField: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
}> = ({ label, required, children, className, error }) => (
  <div className={cn("space-y-2", className)}>
    <Label className="text-sm font-medium text-muted-foreground">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    {children}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

const HistoryTimeline: React.FC<{ history: any[] }> = ({ history }) => {
  if (!history.length) return null;

  return (
    <div className="space-y-4">
      {history.map((entry, index) => {
        const config = STATUS_CONFIG[entry.newStatus];
        const Icon = config?.icon || Package;

        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              {index < history.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {entry.newStatusLabel || config?.label || entry.newStatus}
                </p>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              {entry.previousStatus && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  From: {entry.previousStatusLabel || STATUS_CONFIG[entry.previousStatus]?.label || entry.previousStatus}
                  {entry.assignedTo && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Assigned To: {entry.assignedTo}
                    </p>
                  )}
                </p>
              )}
              {entry.remarks && (
                <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                  {entry.remarks}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AssetStatus: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: asset, isLoading: assetLoading } = useHrmsAssetView(Number(id));
  const { data: assetDetails } = useHrmsAssetDetails(Number(id));
  const { data: history = [] } = useHrmsAssetHistory(Number(id));
  const { data: users = [] } = useUsers();
  const updateStatusMutation = useUpdateHrmsAssetStatus();

  const [showAllHistory, setShowAllHistory] = React.useState(false);

  const hasInitialized = React.useRef(false);


  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetStatus: "",
    },
});
  const status = watch("assetStatus");
  const currentStatus = asset?.assetStatus;

  useEffect(() => {
    if (!asset || hasInitialized.current) return;
    hasInitialized.current = true;

    reset({
      assetStatus: asset.assetStatus || "",
      userId: asset.userId,
      assignedDate: asset.assignedDate?.split("T")[0] || "",
      purpose: asset.purpose || "",
      assetLocation: asset.assetLocation || "",
      returnDate: asset.returnDate?.split("T")[0] || "",
      assetCondition: asset.assetCondition || "",
      damageDate: new Date().toISOString().split("T")[0],
      lostDate: new Date().toISOString().split("T")[0],
      repairStartDate: new Date().toISOString().split("T")[0],
    });
  }, [asset?.id]); // ← ONLY asset.id, not asset or reset

  const onSubmit = async (data: FormData) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: Number(id),
        data: {
          ...data,
          userId: data.userId ? Number(data.userId) : undefined,
        },
      });
      navigate(paths.hrms.assetAdminDashboard);
    } catch (e) {
      console.error(e);
    }
  };

  const isAssigned = status === ASSET_STATUS_KEYS.ASSIGNED;
  const isAvailable = status === ASSET_STATUS_KEYS.AVAILABLE;
  const isReturned = status === ASSET_STATUS_KEYS.RETURNED;
  const isDamaged = status === ASSET_STATUS_KEYS.DAMAGED;
  const isLost = status === ASSET_STATUS_KEYS.LOST;
  const isUnderRepair = status === ASSET_STATUS_KEYS.UNDER_REPAIR;

  if (assetLoading) {
    return (
      <div className="container mx-auto py-6 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Asset not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assetAdminDashboard)}>
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentConfig = STATUS_CONFIG[currentStatus || "2"];

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <span className="font-mono text-primary">{asset.assetCode}</span>
              <Badge className={cn("border-none", currentConfig?.badgeClass)}>
                {currentConfig?.label || "Unknown"}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              {assetDetails?.assetTypeLabel || asset.assetType} • Update Status
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Asset Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Asset Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Brand & Model</p>
                <p className="text-sm">
                  {asset.brand || "N/A"} {asset.model || ""}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Serial Number</p>
                <p className="text-sm font-mono">{asset.serialNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Current Location</p>
                <p className="text-sm">{assetDetails?.assetLocationLabel || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Condition</p>
                <p className="text-sm">{assetDetails?.assetConditionLabel || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Selection */}
        <FormSection
          icon={Package}
          title="Select New Status"
          description="Choose the new status for this asset"
        >
          <Controller
            control={control}
            name="assetStatus"
            render={({ field }) => (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.keys(STATUS_CONFIG).map((value) => (
                  <StatusCard
                    key={value}
                    value={value}
                    selected={field.value === value}
                    onClick={() => field.onChange(value)}
                    currentStatus={currentStatus}
                  />
                ))}
              </div>
            )}
          />
          {errors.assetStatus && (
            <p className="text-sm text-destructive mt-2">{errors.assetStatus.message}</p>
          )}
        </FormSection>

        {/* Assignment Section */}
        {isAssigned && (
          <FormSection
            icon={User}
            title="Assignment Details"
            description="Assign this asset to an employee"
          >
            <InfoBox type="info" title="Assigning Asset">
              Fill in the assignment details. The employee will be notified about
              this assignment.
            </InfoBox>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <FormField label="Assign To" required>
                <Controller
                  control={control}
                  name="userId"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Location">
                <Controller
                  control={control}
                  name="assetLocation"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {toOptions(ASSET_LOCATION).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Assignment Date" required>
                <Input type="date" {...register("assignedDate")} />
              </FormField>


              <FormField label="Purpose" className="md:col-span-2">
                <Textarea
                  {...register("purpose")}
                  placeholder="Describe the purpose of this assignment..."
                  rows={3}
                />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Available Section */}
        {isAvailable && (
          <FormSection
            icon={Package}
            title="Mark as Available"
            description="This asset will be available for assignment"
          >
            <InfoBox type="success" title="Asset Available">
              The asset will be marked as available in the inventory and can be
              assigned to employees.
            </InfoBox>

            <div className="mt-6">
              <FormField label="Remarks">
                <Textarea
                  {...register("remarks")}
                  placeholder="Any notes about marking this asset as available..."
                  rows={3}
                />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Return Section */}
        {isReturned && (
          <FormSection
            icon={RotateCcw}
            title="Return Details"
            description="Record the return of this asset"
          >
            <InfoBox type="success" title="Asset Return">
              Document the asset's condition upon return. Any damages should be
              noted in the condition assessment.
            </InfoBox>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Return Date" required>
                <Input type="date" {...register("returnDate")} />
              </FormField>

              <FormField label="Return Condition" required>
                <Controller
                  control={control}
                  name="assetCondition"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition..." />
                      </SelectTrigger>
                      <SelectContent>
                        {toOptions(ASSET_CONDITION).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Deduction Amount">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    {...register("deductionAmount")}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Deduction Reason">
                <Input {...register("deductionReason")} placeholder="Reason for deduction..." />
              </FormField>

              <FormField label="Remarks" className="md:col-span-2">
                <Textarea
                  {...register("remarks")}
                  placeholder="Additional notes about the return..."
                  rows={3}
                />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Damage Section */}
        {isDamaged && (
          <FormSection
            icon={AlertTriangle}
            title="Damage Report"
            description="Document the damage to this asset"
          >
            <InfoBox type="warning" title="Asset Damaged">
              Provide detailed information about the damage. This helps assess
              repair options and potential deductions.
            </InfoBox>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Damage Date" required>
                <Input type="date" {...register("damageDate")} />
              </FormField>

              <FormField label="Damage Type" required>
                <Controller
                  control={control}
                  name="damageType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select damage type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {toOptions(DAMAGE_TYPE).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Is Repairable?">
                <Controller
                  control={control}
                  name="isRepairable"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="rep-yes" />
                        <Label htmlFor="rep-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="rep-no" />
                        <Label htmlFor="rep-no">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unknown" id="rep-unknown" />
                        <Label htmlFor="rep-unknown">Unknown</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </FormField>

              <FormField label="Asset Condition After">
                <Controller
                  control={control}
                  name="assetCondition"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition..." />
                      </SelectTrigger>
                      <SelectContent>
                        {toOptions(ASSET_CONDITION).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Damage Description" className="md:col-span-2">
                <Textarea
                  {...register("damageDescription")}
                  placeholder="Describe the damage in detail..."
                  rows={3}
                />
              </FormField>

              <Separator className="md:col-span-2" />

              <FormField label="Deduction Amount">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    {...register("deductionAmount")}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Deduction Reason">
                <Input {...register("deductionReason")} placeholder="Reason for deduction..." />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Lost Section */}
        {isLost && (
          <FormSection
            icon={XCircle}
            title="Loss Report"
            description="Document the loss of this asset"
          >
            <InfoBox type="error" title="Asset Lost">
              Provide all available information about the loss. A police report
              may be required for high-value assets.
            </InfoBox>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Date Lost" required>
                <Input type="date" {...register("lostDate")} />
              </FormField>

              <FormField label="Location Where Lost">
                <Input {...register("lostLocation")} placeholder="Where was the asset lost?" />
              </FormField>

              <FormField label="Circumstances" className="md:col-span-2">
                <Textarea
                  {...register("lostCircumstances")}
                  placeholder="Describe the circumstances of the loss..."
                  rows={3}
                />
              </FormField>

              <Separator className="md:col-span-2" />

              <FormField label="Police Report Number">
                <Input {...register("policeReportNumber")} placeholder="FIR / Police report number" />
              </FormField>

              <FormField label="Police Report Date">
                <Input type="date" {...register("policeReportDate")} />
              </FormField>

              <Separator className="md:col-span-2" />

              <FormField label="Deduction Amount" required>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    {...register("deductionAmount")}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Deduction Reason">
                <Input {...register("deductionReason")} placeholder="Reason for deduction..." />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Repair Section */}
        {isUnderRepair && (
          <FormSection
            icon={Wrench}
            title="Repair Details"
            description="Track repair information for this asset"
          >
            <InfoBox type="info" title="Under Repair">
              Document the repair process. Update the end date and actual cost
              when the repair is complete.
            </InfoBox>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Repair Start Date" required>
                <Input type="date" {...register("repairStartDate")} />
              </FormField>

              <FormField label="Expected End Date">
                <Input type="date" {...register("repairEndDate")} />
              </FormField>

              <FormField label="Repair Vendor">
                <Input {...register("repairVendor")} placeholder="Vendor / Service provider name" />
              </FormField>

              <FormField label="Estimated Cost">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    {...register("repairEstimatedCost")}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Repair Description" className="md:col-span-2">
                <Textarea
                  {...register("repairDescription")}
                  placeholder="Describe what needs to be repaired..."
                  rows={3}
                />
              </FormField>
            </div>
          </FormSection>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <FormSection
            icon={History}
            title="Status History"
            description="Recent status changes for this asset"
          >
            <HistoryTimeline
              history={showAllHistory ? history : history.slice(0, 5)}
            />
            {history.length > 5 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                >
                  {showAllHistory
                    ? "Show Less"
                    : `View All History (${history.length} entries)`}
                </Button>
            )}
          </FormSection>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || updateStatusMutation.isPending}
            size="lg"
          >
            {isSubmitting || updateStatusMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AssetStatus;