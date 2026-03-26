import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";

import { useUsers } from "@/hooks/api/useUsers";
import { useCreateHrmsAsset } from "@/hooks/api/useHrmsAssets";

const assetSchema = z.object({
  userId: z.number().positive("Employee is required"),
  assetCode: z.string().min(1, "Asset Code is required"),
  assetType: z.string().min(1, "Asset Type is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  serialNumber: z.string().min(1, "Serial Number is required"),
  imeiNumber: z.string().optional(),
  licenseKey: z.string().optional(),
  assetValue: z.string().optional(),
  assetCondition: z.string().default("good"),
  assignedDate: z.string().min(1, "Assignment date is required"),
  expectedReturnDate: z.string().optional().or(z.literal("")),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  warrantyFrom: z.string().optional().or(z.literal("")),
  warrantyTo: z.string().optional().or(z.literal("")),
});

type AssetFormData = z.infer<typeof assetSchema>;

const AssetAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const createAssetMutation = useCreateHrmsAsset();

  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetType: "Laptop",
      assetCondition: "good",
      assignedDate: new Date().toISOString().split("T")[0],
    },
  });

  const isSubmitting = createAssetMutation.isPending;

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData(formRef.current!);
      // Ensure specific mapped numeric values are correctly parsed in FormData
      formData.set("userId", String(data.userId));

      await createAssetMutation.mutateAsync(formData);
      navigate("/hrms/assets");
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign asset.");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/hrms/assets")} className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
              </Button>
              <div>
                  <h1 className="text-2xl font-bold tracking-tight">Assign Asset</h1>
                  <p className="text-muted-foreground">Allocate physical hardware or software licenses to employees</p>
              </div>
          </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core Detail */}
        <Card>
          <CardHeader>
              <CardTitle>Asset Core Details</CardTitle>
              <CardDescription>Primary identification and classification information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="userId">Assign To Employee <span className="text-red-500">*</span></Label>
                  <Select onValueChange={value => setValue("userId", Number(value))} disabled={isSubmitting || usersLoading}>
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder={usersLoading ? "Loading users..." : "Select employee account"} />
                      </SelectTrigger>
                      <SelectContent>
                          {users.map(u => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                  {u.name} ({u.email})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="assetType">Asset Type <span className="text-red-500">*</span></Label>
                  <Select defaultValue="Laptop" onValueChange={val => setValue("assetType", val)} disabled={isSubmitting}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Laptop">Laptop / Computer</SelectItem>
                          <SelectItem value="Mobile">Mobile Device</SelectItem>
                          <SelectItem value="Monitor">Monitor / Display</SelectItem>
                          <SelectItem value="Peripherals">Peripherals</SelectItem>
                          <SelectItem value="Software">Software License</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                  </Select>
                  {/* Keep input hidden so FormData picks it up */}
                  <input type="hidden" name="assetType" value={watch("assetType")} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="assetCode">Internal Asset Code <span className="text-red-500">*</span></Label>
                  <Input id="assetCode" {...register("assetCode")} placeholder="e.g. LAP-001" disabled={isSubmitting} />
                  {errors.assetCode && <p className="text-sm text-destructive">{errors.assetCode.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hardware Specifics */}
        <Card>
          <CardHeader>
              <CardTitle>Hardware specifics</CardTitle>
              <CardDescription>Model, serial tags, and value identifiers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="brand">Brand / Make <span className="text-red-500">*</span></Label>
                  <Input id="brand" {...register("brand")} placeholder="e.g. Apple, Dell" disabled={isSubmitting} />
                  {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="model">Model Name <span className="text-red-500">*</span></Label>
                  <Input id="model" {...register("model")} placeholder="e.g. MacBook Pro M3" disabled={isSubmitting} />
                  {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number <span className="text-red-500">*</span></Label>
                  <Input id="serialNumber" {...register("serialNumber")} disabled={isSubmitting} />
                  {errors.serialNumber && <p className="text-sm text-destructive">{errors.serialNumber.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="imeiNumber">IMEI Sub-tag</Label>
                  <Input id="imeiNumber" {...register("imeiNumber")} placeholder="For mobile devices" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input id="licenseKey" {...register("licenseKey")} placeholder="For software assets" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="assetValue">Book Value ($)</Label>
                  <Input id="assetValue" {...register("assetValue")} type="number" step="0.01" disabled={isSubmitting} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline & Condition */}
        <Card>
          <CardHeader>
              <CardTitle>Timeline & Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="assignedDate">Assigned Date <span className="text-red-500">*</span></Label>
                  <Input type="date" id="assignedDate" {...register("assignedDate")} disabled={isSubmitting} />
                  {errors.assignedDate && <p className="text-sm text-destructive">{errors.assignedDate.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                  <Input type="date" id="expectedReturnDate" {...register("expectedReturnDate")} disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="warrantyFrom">Warranty From</Label>
                  <Input type="date" id="warrantyFrom" {...register("warrantyFrom")} disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="warrantyTo">Warranty To</Label>
                  <Input type="date" id="warrantyTo" {...register("warrantyTo")} disabled={isSubmitting} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Uploads */}
        <Card>
          <CardHeader>
              <CardTitle>Documents & Attachments</CardTitle>
              <CardDescription>Attach invoices, warranties, and proof conditions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <Label htmlFor="assetPhotos" className="cursor-pointer font-medium mb-1 block">Asset Condition Photos</Label>
                  <p className="text-xs text-muted-foreground mb-3">Upload photos of the physical asset. Up to 5 images.</p>
                  <Input id="assetPhotos" name="assetPhotos" type="file" multiple accept="image/*" disabled={isSubmitting} className="max-w-xs mx-auto" />
              </div>
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <Label htmlFor="purchaseInvoice" className="cursor-pointer font-medium mb-1 block">Purchase Invoice</Label>
                  <p className="text-xs text-muted-foreground mb-3">Attach original billing pdf or image.</p>
                  <Input id="purchaseInvoice" name="purchaseInvoice" type="file" accept=".pdf,image/*" disabled={isSubmitting} className="max-w-xs mx-auto" />
              </div>
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <Label htmlFor="warrantyCard" className="cursor-pointer font-medium mb-1 block">Warranty Document</Label>
                  <p className="text-xs text-muted-foreground mb-3">Attach extended warranty guarantees.</p>
                  <Input id="warrantyCard" name="warrantyCard" type="file" accept=".pdf,image/*" disabled={isSubmitting} className="max-w-xs mx-auto" />
              </div>
              <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-xl p-6 text-center">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <Label htmlFor="assignmentForm" className="cursor-pointer font-medium mb-1 block">Signed Handover Sheet</Label>
                  <p className="text-xs text-muted-foreground mb-3">Company physical handover agreement.</p>
                  <Input id="assignmentForm" name="assignmentForm" type="file" accept=".pdf,image/*" disabled={isSubmitting} className="max-w-xs mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate("/hrms/assets")} disabled={isSubmitting}>
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
      </form>
    </div>
  );
};

export default AssetAssignment;
