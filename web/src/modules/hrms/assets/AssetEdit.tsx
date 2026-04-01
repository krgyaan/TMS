import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectField } from "@/components/form/SelectField";
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toOptions, ASSET_TYPE, ASSET_CATEGORY, ASSET_CONDITION, ASSET_LOCATION, ASSET_STATUS, ACCESSORIES_LIST } from "./constants";
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Loader2,
  Save,
  Monitor,
  Smartphone,
  Laptop,
  Keyboard,
  Car,
  CreditCard,
  Package,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';

import { useUsers } from '@/hooks/api/useUsers';
import { useHrmsAssetView, useUpdateHrmsAsset } from '@/hooks/api/useHrmsAssets';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { paths } from '@/app/routes/paths';

const assetSchema = z.object({
  userId: z.string().optional(),
  assetCode: z.string().min(1, 'Asset Code is required'),
  assetType: z.string().min(1, 'Asset Type is required'),
  assetCategory: z.string().min(1, 'Asset Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  specifications: z.string().optional(),
  assetValue: z.string().optional(),
  assetCondition: z.string().min(1, 'Asset Condition is required'),
  assignedDate: z.string().optional().or(z.literal('')),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  serialNumber: z.string().optional(),
  imeiNumber: z.string().optional(),
  licenseKey: z.string().optional(),
  warrantyFrom: z.string().optional().or(z.literal('')),
  warrantyTo: z.string().optional().or(z.literal('')),
  insuranceDetails: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  accessoryDetails: z.string().optional(),
  assetStatus: z.string().optional(),
  returnDate: z.string().optional().or(z.literal('')),
  returnCondition: z.string().optional(),
  damageRemarks: z.string().optional(),
  deductionAmount: z.string().optional(),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.string().optional(),
  purchaseFrom: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;



const toDateInput = (date: string | null | undefined): string => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const getAssetFileUrl = (storedValue: string | null | undefined): string => {
  if (!storedValue) return '';
  return `/uploads/hrms/assets/${storedValue}`;
};

const AssetEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading: assetLoading } = useHrmsAssetView(Number(id));
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: currentUser } = useCurrentUser();
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
  
  const methods = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const watchAssetType = watch('assetType');
  const watchAssetStatus = watch('assetStatus');

  // Populate form when asset data loads
  useEffect(() => {
    if (asset) {
      const formData: any = {
        userId: String(asset.userId),
        assetCode: asset.assetCode || '',
        assetType: asset.assetType || '',
        assetCategory: asset.assetCategory || '',
        brand: asset.brand || '',
        model: asset.model || '',
        specifications: asset.specifications || '',
        assetValue: asset.assetValue || '',
        assetCondition: asset.assetCondition || '',
        assignedDate: toDateInput(asset.assignedDate),
        purpose: asset.purpose || '',
        assetLocation: asset.assetLocation || '',
        serialNumber: asset.serialNumber || '',
        imeiNumber: asset.imeiNumber || '',
        licenseKey: asset.licenseKey || '',
        warrantyFrom: toDateInput(asset.warrantyFrom),
        warrantyTo: toDateInput(asset.warrantyTo),
        insuranceDetails: asset.insuranceDetails || '',
        assetStatus: asset.assetStatus || '',
        returnDate: toDateInput(asset.returnDate),
        returnCondition: asset.returnCondition || '',
        damageRemarks: asset.damageRemarks || '',
        deductionAmount: asset.deductionAmount || '',
        purchaseDate: toDateInput(asset.purchaseDate),
        purchasePrice: asset.purchasePrice || "",
        purchaseFrom: asset.purchaseFrom || "",
      };

      reset(formData);

      if (asset.accessories && Array.isArray(asset.accessories)) {
        setSelectedAccessories(asset.accessories);
        setValue('accessories', asset.accessories);
      }

        setExistingFiles({
          purchaseInvoice: asset.purchaseInvoiceUrl || "",
          warrantyCard: asset.warrantyCardUrl || "",
          assignmentForm: asset.assignmentFormUrl || "",
          assetPhotos: asset.assetPhotos || [],
        });
    }
  }, [asset, reset, setValue]);

  const isSubmitting = updateAssetMutation.isPending;

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedAccessories, accessoryId]
      : selectedAccessories.filter((id) => id !== accessoryId);
    setSelectedAccessories(updated);
    setValue('accessories', updated);
  };

  const handleRemoveFile = (type: string) => {
  setRemovedFiles(prev => [...prev, type]);

  setExistingFiles(prev => ({
    ...prev,
    [type]: "",
  }));
};

const handleRemovePhoto = (photo: string) => {
  setRemovedFiles(prev => [...prev, photo]);

  setExistingFiles(prev => ({
    ...prev,
    assetPhotos: prev.assetPhotos.filter(p => p !== photo),
  }));
};

  const onSubmit = async (data: AssetFormData) => {
    try {
      const formData = new FormData();

      // Normal fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // AssignedBy
      if (currentUser?.id) {
        formData.append("assignedBy", String(currentUser.id));
      }

      // Removed files
      formData.append("removedFiles", JSON.stringify(removedFiles));

      // New files
      if (newFiles.purchaseInvoice)
        formData.append("purchaseInvoice", newFiles.purchaseInvoice);

      if (newFiles.warrantyCard)
        formData.append("warrantyCard", newFiles.warrantyCard);

      if (newFiles.assignmentForm)
        formData.append("assignmentForm", newFiles.assignmentForm);

      newFiles.assetPhotos.forEach((file) => {
        formData.append("assetPhotos", file);
      });

      await updateAssetMutation.mutateAsync({
        id: Number(id),
        data: formData,
      });

      navigate(paths.hrms.assetView(Number(id)));
    } catch (e) {
      console.error(e);
    }
  }

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
  };

    if (assetLoading) {
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

    if (!asset) {
      return (
        <div className="container mx-auto py-6 max-w-6xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Asset not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/hrms/admin/assets')}>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if(window.history.length > 1){
                  navigate(-1)
                }else{
                  navigate(paths.hrms.assetAdminDashboard)
                }
              }}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Edit Asset</h1>
              <p className="text-muted-foreground">
                Update asset information for{' '}
                <span className="font-mono text-primary">{asset.assetCode}</span>
              </p>
            </div>
          </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
            {/* Section 1: Asset Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Information
                </CardTitle>
                <CardDescription>Primary identification and classification information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField label="Asset ID/Code" required error={errors.assetCode?.message}>
                    <Input
                      {...register('assetCode')}
                      placeholder="Auto-generated"
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                  </FormField>

                  <SelectField
                        control={control}
                        name="assetType"
                        label="Asset Type"
                        placeholder="Select Asset Type"
                        options={toOptions(ASSET_TYPE)}
                      />

                    <SelectField
                        control={control}
                        name="assetCategory"
                        label="Asset Category"
                        placeholder="Select Category"
                        options={toOptions(ASSET_CATEGORY)}
                      />

                  <FormField label="Brand/Manufacturer" required error={errors.brand?.message}>
                    <Input {...register('brand')} placeholder="e.g. Apple, Dell, HP" disabled={isSubmitting} />
                  </FormField>

                  <FormField label="Model" required error={errors.model?.message}>
                    <Input {...register('model')} placeholder="e.g. MacBook Pro 14-inch" disabled={isSubmitting} />
                  </FormField>

                  <FormField label="Asset Value ($)" error={errors.assetValue?.message}>
                    <Input
                      {...register('assetValue')}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </FormField>

                    <SelectField
                      control={control}
                      name="assetCondition"
                      label="Asset Condition"
                      placeholder="Select Condition"
                      options={toOptions(ASSET_CONDITION)}
                    />
                </div>

                <FormField label="Specifications">
                  <Textarea
                    {...register('specifications')}
                    placeholder="Enter detailed specifications (RAM, Storage, Processor, Screen Size, etc.)"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Section 2: Assignment Details */}


            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Details
                </CardTitle>
                <CardDescription>
                  Information about how and when this asset was purchased
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <FormField label="Purchase Date">
                    <Input
                      type="date"
                      {...register("purchaseDate")}
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField label="Purchase Price">
                    <Input
                      type="number"
                      step="0.01"
                      {...register("purchasePrice")}
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField label="Purchase From (Vendor)">
                    <Input
                      {...register("purchaseFrom")}
                      placeholder="Vendor name"
                      disabled={isSubmitting}
                    />
                  </FormField>

                </div>
              </CardContent>
            </Card>

            {/* Section 3: Asset Identification */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Identification</CardTitle>
                <CardDescription>Serial numbers, keys, and warranty information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField label="Serial Number" required error={errors.serialNumber?.message}>
                    <Input
                      {...register('serialNumber')}
                      placeholder="Enter serial number"
                      className="font-mono"
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField label="IMEI Number">
                    <Input
                      {...register('imeiNumber')}
                      placeholder="For mobile devices"
                      className="font-mono"
                      disabled={isSubmitting || !["3", "11"].includes(watchAssetType)}
                    />
                  </FormField>

                  <FormField label="License Key">
                    <Input
                      {...register('licenseKey')}
                      placeholder="For software licenses"
                      className="font-mono"
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField label="Warranty Period (From)">
                    <Input type="date" {...register('warrantyFrom')} disabled={isSubmitting} />
                  </FormField>

                  <FormField label="Warranty Period (To)">
                    <Input type="date" {...register('warrantyTo')} disabled={isSubmitting} />
                  </FormField>

                  <FormField label="Insurance Details">
                    <Input
                      {...register('insuranceDetails')}
                      placeholder="Policy number or details"
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Asset Accessories */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Accessories</CardTitle>
                <CardDescription>Items included with the asset</CardDescription>
              </CardHeader>
              <CardContent>
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
                          onCheckedChange={(checked) => handleAccessoryChange(accessory.id, checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor={accessory.id} className="text-sm font-normal cursor-pointer">
                          {accessory.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Documents And Attachments */}

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Documents & Attachments</CardTitle>
                <CardDescription>
                  Manage invoices, warranty documents, assignment forms, and asset images
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">

                {/* ================= EXISTING FILES ================= */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Existing Documents</Label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {existingFiles.purchaseInvoice && (
                      <FilePreview
                        label="Purchase Invoice"
                        url={existingFiles.purchaseInvoice}
                        onRemove={() => handleRemoveFile("purchaseInvoice")}
                      />
                    )}

                    {existingFiles.warrantyCard && (
                      <FilePreview
                        label="Warranty Card"
                        url={existingFiles.warrantyCard}
                        onRemove={() => handleRemoveFile("warrantyCard")}
                      />
                    )}

                    {existingFiles.assignmentForm && (
                      <FilePreview
                        label="Assignment Form"
                        url={existingFiles.assignmentForm}
                        onRemove={() => handleRemoveFile("assignmentForm")}
                      />
                    )}

                    {!existingFiles.purchaseInvoice &&
                      !existingFiles.warrantyCard &&
                      !existingFiles.assignmentForm && (
                        <p className="text-sm text-muted-foreground">
                          No documents uploaded yet
                        </p>
                      )}
                  </div>
                </div>

                {/* ================= EXISTING PHOTOS ================= */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Asset Photos</Label>

                  {existingFiles.assetPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingFiles.assetPhotos.map((photo, i) => (
                        <div
                          key={i}
                          className="relative group rounded-xl overflow-hidden border"
                        >
                          <img
                            src={getAssetFileUrl(photo)}
                            className="h-32 w-full object-cover"
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemovePhoto(photo)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No asset photos uploaded
                    </p>
                  )}
                </div>

                {/* ================= UPLOAD NEW FILES ================= */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Upload New Files</Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Purchase Invoice */}
                    <div className="border border-dashed rounded-xl p-5 text-center hover:border-primary transition">
                      <Label className="block font-medium mb-1">Purchase Invoice</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload invoice (PDF or image)
                      </p>

                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        className="max-w-xs mx-auto"
                        onChange={(e) =>
                          setNewFiles(prev => ({
                            ...prev,
                            purchaseInvoice: e.target.files?.[0] || null
                          }))
                        }
                      />

                      {newFiles.purchaseInvoice && (
                        <p className="text-xs text-green-600 mt-2">
                          Selected: {newFiles.purchaseInvoice.name}
                        </p>
                      )}
                    </div>

                    {/* Warranty Card */}
                    <div className="border border-dashed rounded-xl p-5 text-center hover:border-primary transition">
                      <Label className="block font-medium mb-1">Warranty Card</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload warranty document
                      </p>

                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        className="max-w-xs mx-auto"
                        onChange={(e) =>
                          setNewFiles(prev => ({
                            ...prev,
                            warrantyCard: e.target.files?.[0] || null
                          }))
                        }
                      />

                      {newFiles.warrantyCard && (
                        <p className="text-xs text-green-600 mt-2">
                          Selected: {newFiles.warrantyCard.name}
                        </p>
                      )}
                    </div>

                    {/* Assignment Form */}
                    <div className="border border-dashed rounded-xl p-5 text-center hover:border-primary transition">
                      <Label className="block font-medium mb-1">Signed Assignment Form</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload signed agreement
                      </p>

                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        className="max-w-xs mx-auto"
                        onChange={(e) =>
                          setNewFiles(prev => ({
                            ...prev,
                            assignmentForm: e.target.files?.[0] || null
                          }))
                        }
                      />

                      {newFiles.assignmentForm && (
                        <p className="text-xs text-green-600 mt-2">
                          Selected: {newFiles.assignmentForm.name}
                        </p>
                      )}
                    </div>

                    {/* Asset Photos */}
                    <div className="border border-dashed rounded-xl p-5 text-center hover:border-primary transition">
                      <Label className="block font-medium mb-1">Asset Photos</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload images (max 5 recommended)
                      </p>

                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        className="max-w-xs mx-auto"
                        onChange={(e) =>
                          setNewFiles(prev => ({
                            ...prev,
                            assetPhotos: Array.from(e.target.files || [])
                          }))
                        }
                      />

                      {newFiles.assetPhotos.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          {newFiles.assetPhotos.length} file(s) selected
                        </p>
                      )}
                    </div>

                  </div>
                </div>

              </CardContent>
            </Card>

            <Separator />

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Review all changes before saving</p>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(paths.hrms.assetView(Number(id)))}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-48">
                  {isSubmitting ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    );
  };

// Helper Component for Form Fields
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, children }) => {
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

const FilePreview = ({ label, url, onRemove }: { label: string; url: string; onRemove: () => void }) => {
  const fileUrl = getAssetFileUrl(url);
  // Match against the filename portion (last segment) to detect image type
  const filename = url.split('/').pop() || url;
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

      <Button size="sm" variant="destructive" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
};

export default AssetEdit;