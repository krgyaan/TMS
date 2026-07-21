import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useHrmsAssetView, useUpdateHrmsAssetStatus } from "@/hooks/api/useHrmsAssets";
import { useUsers } from "@/hooks/api/useUsers";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ASSET_CONDITION, ASSET_LOCATION, ASSET_STATUS, DAMAGE_TYPE, DISPOSAL_TYPE, toOptions } from "../constants";
import { statusUpdateSchema, type StatusUpdateFormData } from "../helpers/asset.schema";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

interface AssetStatusFormProps {
  assetId: number;
}

const AssetStatusForm: React.FC<AssetStatusFormProps> = ({ assetId }) => {
  const navigate = useNavigate();
  const { data: asset, isLoading: assetLoading } = useHrmsAssetView(assetId);
  const { data: users = [] } = useUsers();
  const updateStatusMutation = useUpdateHrmsAssetStatus();
  const hasInitialized = useRef(false);

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: { assetStatus: "" },
  });
  const { handleSubmit, control, reset, formState: { isSubmitting }, watch } = form;
  const status = watch("assetStatus");

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
  }, [asset?.id]);

  const onSubmit = async (data: StatusUpdateFormData) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: assetId,
        data: { ...data, userId: data.userId ? Number(data.userId) : undefined },
      });
      navigate(paths.hrms.assets.list);
    } catch (e) {
      console.error(e);
    }
  };

  if (assetLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-6">
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
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assets.list)}>
              Back to Assets
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
            <CardTitle>Update Status — {asset.assetCode}</CardTitle>
            <CardDescription className="mt-1">Change the status and update related fields</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SelectField
                control={control}
                name="assetStatus"
                label={<>Status <span className="text-destructive">*</span></>}
                options={toOptions(ASSET_STATUS)}
                placeholder="Select status..."
              />
            </div>

            {status === "assigned" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Assignment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SelectField
                    control={control}
                    name="userId"
                    label="Assign To"
                    options={users.map((u: any) => ({ id: String(u.id), name: u.name, description: u.email }))}
                    placeholder="Select employee..."
                  />
                  <SelectField
                    control={control}
                    name="assetLocation"
                    label="Location"
                    options={toOptions(ASSET_LOCATION)}
                    placeholder="Select location..."
                  />
                  <FieldWrapper control={control} name="assignedDate" label="Assignment Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="purpose" label="Purpose">
                    {field => <Textarea {...field} placeholder="Purpose of assignment..." rows={3} />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            {status === "returned" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Return Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWrapper control={control} name="returnDate" label="Return Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <SelectField
                    control={control}
                    name="returnCondition"
                    label="Return Condition"
                    options={toOptions(ASSET_CONDITION)}
                    placeholder="Select condition..."
                  />
                  <SelectField
                    control={control}
                    name="assetCondition"
                    label="Asset Condition"
                    options={toOptions(ASSET_CONDITION)}
                    placeholder="Select condition..."
                  />
                  <FieldWrapper control={control} name="deductionAmount" label="Deduction Amount">
                    {field => (
                      <div className="relative">
                        <Input type="number" step="0.01" value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} placeholder="0.00" />
                      </div>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="deductionReason" label="Deduction Reason">
                    {field => <Input {...field} placeholder="Reason for deduction..." />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            {status === "damaged" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Damage Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWrapper control={control} name="damageDate" label="Damage Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <SelectField
                    control={control}
                    name="damageType"
                    label="Damage Type"
                    options={toOptions(DAMAGE_TYPE)}
                    placeholder="Select damage type..."
                  />
                  <FieldWrapper control={control} name="isRepairable" label="Is Repairable?">
                    {field => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="rep-yes" /><Label htmlFor="rep-yes">Yes</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="rep-no" /><Label htmlFor="rep-no">No</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="unknown" id="rep-unknown" /><Label htmlFor="rep-unknown">Unknown</Label></div>
                      </RadioGroup>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="damageDescription" label="Damage Description">
                    {field => <Textarea {...field} placeholder="Describe the damage..." rows={3} />}
                  </FieldWrapper>
                  <SelectField
                    control={control}
                    name="assetCondition"
                    label="Asset Condition"
                    options={toOptions(ASSET_CONDITION)}
                    placeholder="Select condition..."
                  />
                  <FieldWrapper control={control} name="deductionAmount" label="Deduction Amount">
                    {field => (
                      <div className="relative">
                        <Input type="number" step="0.01" value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} placeholder="0.00" />
                      </div>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="deductionReason" label="Deduction Reason">
                    {field => <Input {...field} placeholder="Reason for deduction..." />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            {status === "lost" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Loss Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWrapper control={control} name="lostDate" label="Date Lost">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="lostLocation" label="Location Lost">
                    {field => <Input {...field} placeholder="Where was it lost?" />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="lostCircumstances" label="Circumstances">
                    {field => <Textarea {...field} placeholder="Circumstances of loss..." rows={3} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="policeReportNumber" label="Police Report #">
                    {field => <Input {...field} placeholder="FIR / Police report number" />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="policeReportDate" label="Police Report Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="deductionAmount" label="Deduction Amount">
                    {field => (
                      <div className="relative">
                        <Input type="number" step="0.01" value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} placeholder="0.00" />
                      </div>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="deductionReason" label="Deduction Reason">
                    {field => <Input {...field} placeholder="Reason for deduction..." />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            {status === "under_repair" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Repair Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWrapper control={control} name="repairStartDate" label="Repair Start Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="repairEndDate" label="Repair End Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="repairEstimatedCost" label="Estimated Cost">
                    {field => (
                      <div className="relative">
                        <Input type="number" step="0.01" value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} placeholder="0.00" />
                      </div>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="repairVendor" label="Repair Vendor">
                    {field => <Input {...field} placeholder="Vendor / Service provider..." />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="repairDescription" label="Repair Description">
                    {field => <Textarea {...field} placeholder="Describe repairs needed..." rows={3} />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            {status === "disposed" && (
              <div className="border rounded-lg border-dashed p-4 space-y-4">
                <h3 className="text-lg font-semibold">Disposal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWrapper control={control} name="disposalDate" label="Disposal Date">
                    {field => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                  </FieldWrapper>
                  <SelectField
                    control={control}
                    name="disposalType"
                    label="Disposal Type"
                    options={toOptions(DISPOSAL_TYPE)}
                    placeholder="Select disposal type..."
                  />
                  <FieldWrapper control={control} name="disposalAmount" label="Disposal Amount">
                    {field => (
                      <div className="relative">
                        <Input type="number" step="0.01" value={field.value ?? ""} onChange={e => field.onChange(e.target.value)} placeholder="0.00" />
                      </div>
                    )}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="disposalApprovedBy" label="Approved By">
                    {field => <Input {...field} placeholder="Approving authority name" />}
                  </FieldWrapper>
                  <FieldWrapper control={control} name="disposalReason" label="Disposal Reason">
                    {field => <Textarea {...field} placeholder="Reason for disposal..." rows={3} />}
                  </FieldWrapper>
                </div>
              </div>
            )}

            <div className="border rounded-lg border-dashed p-4 space-y-4">
              <FieldWrapper control={control} name="remarks" label="Remarks">
                {field => <Textarea {...field} placeholder="Additional notes..." rows={4} />}
              </FieldWrapper>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || updateStatusMutation.isPending}>
                {isSubmitting || updateStatusMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Update Status</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AssetStatusForm;
