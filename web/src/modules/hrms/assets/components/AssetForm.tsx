import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2, Plus, Save, Upload, X } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { DateInput } from "@/components/form/DateInput";
import { NumberInput } from "@/components/form/NumberInput";
import { paths } from "@/app/routes/paths";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { useCreateHrmsAsset, useHrmsAssetView, useUpdateHrmsAsset } from "@/hooks/api/useHrmsAssets";
import { ASSET_CATEGORY, ASSET_CONDITION, ASSET_TYPE, CATEGORY_TYPES, getTypesForCategory, toOptions } from "../constants";
import { createAssetSchema, editAssetSchema } from "../helpers/asset.schema";
import { buildCreateFormData, buildEditFormData, getAssetFileUrl, toDateInput } from "../helpers/asset.mappers";
import { MOBILE_TYPES } from "../helpers/asset.types";
import { getTypeSpecFields } from "../helpers/typeSpecs";

interface AssetFormProps {
  mode: "create" | "edit";
  assetId?: number;
}

const AssetForm: React.FC<AssetFormProps> = ({ mode, assetId }) => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: asset, isLoading: assetLoading } = useHrmsAssetView(mode === "edit" ? assetId : undefined);
  const createAssetMutation = useCreateHrmsAsset();
  const updateAssetMutation = useUpdateHrmsAsset();

  const [accessories, setAccessories] = useState<string[]>([]);
  const [accessoryInput, setAccessoryInput] = useState("");
  const [existingFiles, setExistingFiles] = useState({ purchaseInvoice: "", warrantyCard: "", assignmentForm: "", assetPhotos: [] as string[] });
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);

  const purchaseInvoiceRef = useRef<HTMLInputElement>(null);
  const warrantyCardRef = useRef<HTMLInputElement>(null);
  const assetPhotosRef = useRef<HTMLInputElement>(null);
  const assignmentFormRef = useRef<HTMLInputElement>(null);
  const initialRender = useRef(true);

  const schema = mode === "create" ? createAssetSchema : editAssetSchema;

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: mode === "create"
      ? { assetType: "laptop", assetCategory: "it_equipment", assetCondition: "new", assetStatus: "available", accessories: [] }
      : undefined,
  });

  const { handleSubmit, formState: { isSubmitting }, setValue, watch, control, reset } = form;
  const watchAssetType = watch("assetType");
  const watchAssetCategory = watch("assetCategory");
  const isMobile = MOBILE_TYPES.includes(watchAssetType);
  const isSubmittingForm = createAssetMutation.isPending || updateAssetMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && asset) {
      reset({
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
        expectedReturnDate: toDateInput(asset.expectedReturnDate),
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
        typeSpecs: asset.typeSpecs || {},
      });
      if (asset.accessories && Array.isArray(asset.accessories)) {
        setAccessories(asset.accessories);
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

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (!MOBILE_TYPES.includes(watchAssetType)) {
      setValue("imeiNumber", "");
      setValue("licenseKey", "");
    }
  }, [watchAssetType, setValue]);

  useEffect(() => {
    if (!watchAssetCategory) return;
    const allowedTypes = CATEGORY_TYPES[watchAssetCategory] ?? [];
    if (watchAssetType && !allowedTypes.includes(watchAssetType)) {
      setValue("assetType", allowedTypes[0] ?? "");
    }
  }, [watchAssetCategory, watchAssetType, setValue]);

  const addAccessory = () => {
    const trimmed = accessoryInput.trim();
    if (!trimmed) return;
    setAccessories(prev => [...prev, trimmed]);
    setValue("accessories", [...accessories, trimmed]);
    setAccessoryInput("");
  };

  const removeAccessory = (index: number) => {
    setAccessories(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setValue("accessories", updated);
      return updated;
    });
  };

  const handleRemoveFile = (type: string) => {
    setRemovedFiles(prev => [...prev, type]);
    setExistingFiles(prev => ({ ...prev, [type]: "" }));
  };

  const handleRemovePhoto = (photo: string) => {
    setRemovedFiles(prev => [...prev, photo]);
    setExistingFiles(prev => ({ ...prev, assetPhotos: prev.assetPhotos.filter(p => p !== photo) }));
  };

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        const fileRefs = { purchaseInvoiceRef, warrantyCardRef, assetPhotosRef, assignmentFormRef };
        const formData = buildCreateFormData(data, fileRefs, accessories, currentUser?.id);
        await createAssetMutation.mutateAsync(formData);
        navigate(paths.hrms.assets.list);
      } else {
        const newFiles = {
          purchaseInvoice: purchaseInvoiceRef.current?.files?.[0] ?? null,
          warrantyCard: warrantyCardRef.current?.files?.[0] ?? null,
          assignmentForm: assignmentFormRef.current?.files?.[0] ?? null,
          assetPhotos: Array.from(assetPhotosRef.current?.files || []) as File[],
        };
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
      <div className="container mx-auto py-6 max-w-6xl">
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
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assets.list)}>Back to Assets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = mode === "create" ? "Add Asset to Inventory" : "Edit Asset";
  const description = mode === "create"
    ? "Register a new asset in the inventory"
    : `Update information for ${asset?.assetCode}`;

  const typeSpecFields = getTypeSpecFields(watchAssetType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="border rounded-lg border-dashed p-4 space-y-4">
              <h3 className="text-lg font-semibold">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mode === "edit" && (
                  <FieldWrapper control={control} name="assetCode" label="Asset Code">
                    {field => <Input {...field} placeholder="Auto-generated" disabled className="font-mono" />}
                  </FieldWrapper>
                )}
                <SelectField
                  control={control}
                  name="assetCategory"
                  label={<>Asset Category <span className="text-destructive">*</span></>}
                  options={toOptions(ASSET_CATEGORY)}
                  placeholder="Select Category"
                />
                <SelectField
                  control={control}
                  name="assetType"
                  label={<>Asset Type <span className="text-destructive">*</span></>}
                  options={getTypesForCategory(watchAssetCategory)}
                  placeholder={watchAssetCategory ? "Select Asset Type" : "Select a category first"}
                />
                <FieldWrapper control={control} name="brand" label={<>Brand <span className="text-destructive">*</span></>}>
                  {field => <Input {...field} placeholder="e.g. Apple, Dell, HP" />}
                </FieldWrapper>
                <FieldWrapper control={control} name="model" label={<>Model <span className="text-destructive">*</span></>}>
                  {field => <Input {...field} placeholder="e.g. MacBook Pro 14-inch" />}
                </FieldWrapper>
                <SelectField
                  control={control}
                  name="assetCondition"
                  label={<>Condition <span className="text-destructive">*</span></>}
                  options={toOptions(ASSET_CONDITION)}
                  placeholder="Select Condition"
                />
                <FieldWrapper control={control} name="assetValue" label="Asset Value">
                  {field => <NumberInput value={field.value} onChange={field.onChange} placeholder="0.00" />}
                </FieldWrapper>
              </div>

              <FieldWrapper control={control} name="specifications" label="Specifications">
                {field => <Textarea {...field} placeholder="Detailed specs: RAM, Storage, Processor, Screen Size, etc." rows={3} />}
              </FieldWrapper>

              {typeSpecFields.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-md font-semibold">{ASSET_TYPE[watchAssetType]} Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {typeSpecFields.map(f => {
                      const name = `typeSpecs.${f.key}`;
                      if (f.type === "select") {
                        return (
                          <SelectField
                            key={f.key}
                            control={control}
                            name={name}
                            label={f.label}
                            options={f.options!.map(o => ({ id: o.value, name: o.label }))}
                            placeholder={`Select ${f.label}`}
                          />
                        );
                      }
                      if (f.type === "date") {
                        return (
                          <FieldWrapper key={f.key} control={control} name={name} label={f.label}>
                            {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                          </FieldWrapper>
                        );
                      }
                      if (f.type === "number") {
                        return (
                          <FieldWrapper key={f.key} control={control} name={name} label={f.label}>
                            {field => <NumberInput value={field.value} onChange={field.onChange} placeholder={f.placeholder} />}
                          </FieldWrapper>
                        );
                      }
                      return (
                        <FieldWrapper key={f.key} control={control} name={name} label={f.label}>
                          {field => <Input {...field} placeholder={f.placeholder} />}
                        </FieldWrapper>
                      );
                    })}
                  </div>
                </div>
              )}
              <h3 className="text-lg font-semibold">Accessories</h3>
              <div className="flex items-center gap-2">
                <Input
                  value={accessoryInput}
                  onChange={e => setAccessoryInput(e.target.value)}
                  placeholder="Type accessory name..."
                  className="max-w-xs"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAccessory())}
                />
                <Button type="button" size="sm" variant="outline" onClick={addAccessory} disabled={!accessoryInput.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {accessories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {accessories.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {item}
                      <button type="button" onClick={() => removeAccessory(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="border rounded-lg border-dashed p-4 space-y-4">
              <h3 className="text-lg font-semibold">Purchase & Identification Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FieldWrapper control={control} name="purchaseDate" label="Purchase Date">
                  {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                </FieldWrapper>
                <FieldWrapper control={control} name="purchasePrice" label="Purchase Price ($)">
                  {field => <NumberInput value={field.value} onChange={field.onChange} placeholder="0.00" />}
                </FieldWrapper>
                <FieldWrapper control={control} name="purchaseFrom" label="Vendor">
                  {field => <Input {...field} placeholder="Vendor name" />}
                </FieldWrapper>
                
                <FieldWrapper control={control} name="serialNumber" label="Serial Number">
                  {field => <Input {...field} placeholder="Serial number" className="font-mono" />}
                </FieldWrapper>
                {isMobile && (
                  <>
                    <FieldWrapper control={control} name="imeiNumber" label="IMEI Number">
                      {field => <Input {...field} placeholder="15-digit IMEI" className="font-mono" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="licenseKey" label="License Key">
                      {field => <Input {...field} placeholder="License key" className="font-mono" />}
                    </FieldWrapper>
                  </>
                )}
                <FieldWrapper control={control} name="warrantyFrom" label="Warranty From">
                  {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                </FieldWrapper>
                <FieldWrapper control={control} name="warrantyTo" label="Warranty To">
                  {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                </FieldWrapper>
                {mode === "edit" && (
                  <FieldWrapper control={control} name="insuranceDetails" label="Insurance">
                    {field => <Input {...field} placeholder="Policy number" />}
                  </FieldWrapper>
                )}
              </div>
            </div>

            <div className="border rounded-lg border-dashed p-4 space-y-4">
              <h3 className="text-lg font-semibold">Documents</h3>

              {mode === "edit" && (existingFiles.purchaseInvoice || existingFiles.warrantyCard || existingFiles.assignmentForm) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Existing Documents</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {existingFiles.purchaseInvoice && (
                      <div className="border rounded-lg p-3 flex items-center justify-between gap-2">
                        <span className="text-sm truncate">Purchase Invoice</span>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveFile("purchaseInvoice")}>Remove</Button>
                      </div>
                    )}
                    {existingFiles.warrantyCard && (
                      <div className="border rounded-lg p-3 flex items-center justify-between gap-2">
                        <span className="text-sm truncate">Warranty Card</span>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveFile("warrantyCard")}>Remove</Button>
                      </div>
                    )}
                    {existingFiles.assignmentForm && (
                      <div className="border rounded-lg p-3 flex items-center justify-between gap-2">
                        <span className="text-sm truncate">Assignment Form</span>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveFile("assignmentForm")}>Remove</Button>
                      </div>
                    )}
                  </div>
                  {existingFiles.assetPhotos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingFiles.assetPhotos.map((photo, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border">
                          <img src={getAssetFileUrl(photo)} className="h-24 w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Button size="sm" variant="destructive" onClick={() => handleRemovePhoto(photo)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { ref: purchaseInvoiceRef, id: "purchaseInvoice", label: "Purchase Invoice", accept: ".pdf,image/*" },
                  { ref: warrantyCardRef, id: "warrantyCard", label: "Warranty Card", accept: ".pdf,image/*" },
                  { ref: assetPhotosRef, id: "assetPhotos", label: "Asset Photos", accept: "image/*", multiple: true },
                  { ref: assignmentFormRef, id: "assignmentForm", label: "Assignment Form", accept: ".pdf,image/*" },
                ].map(item => (
                  <div key={item.id} className="border border-dashed rounded-lg p-4 text-center">
                    <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                    <Input id={item.id} ref={item.ref as any} type="file" accept={item.accept} multiple={item.multiple} disabled={isSubmittingForm} className="mt-2 max-w-xs mx-auto" />
                  </div>
                ))}
              </div>
              
              <FieldWrapper control={control} name="remarks" label="Remarks">
                {field => <Textarea {...field} placeholder="Additional notes..." rows={4} />}
              </FieldWrapper>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmittingForm}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingForm}>
                {isSubmittingForm ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {mode === "create" ? "Add to Inventory" : "Save Changes"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AssetForm;
