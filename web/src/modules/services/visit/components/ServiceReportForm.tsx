import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Save, Loader2, FileText, Calendar, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { DateTimeInput } from "@/components/form/DateTimeInput";
import { FileUploader } from "@/components/file-upload/FileUploader";
import { paths } from "@/app/routes/paths";
import { useServiceVisit, useCreateServiceVisit, useUpdateServiceVisit } from "@/hooks/api/useServiceVisit";
import {
    ServiceVisitFormSchema,
    serviceVisitFormDefaultValues,
    type ServiceVisitFormValues,
    type CreateServiceVisitReportDto,
    type ServiceVisitAttachment,
} from "../helpers/service-visit.types";

const inputCls =
    "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent " +
    "px-3 py-1 text-sm outline-none focus-visible:border-ring " +
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const sectionCls = "py-6 px-6 border-b last:border-b-0";

interface ServiceReportFormProps {
    complaintId?: number;
    reportId?: number;
}

export function ServiceReportForm({ complaintId, reportId }: ServiceReportFormProps) {
    const navigate = useNavigate();
    const isEdit = !!reportId;

    const createReport = useCreateServiceVisit();
    const updateReport = useUpdateServiceVisit();
    const { data: report } = useServiceVisit(reportId ?? 0);

    const [resolvedPhotoPaths, setResolvedPhotoPaths] = useState<ServiceVisitAttachment[]>([]);
    const [signedPhotoPaths, setSignedPhotoPaths] = useState<ServiceVisitAttachment[]>([]);

    const form = useForm<ServiceVisitFormValues>({
        resolver: zodResolver(ServiceVisitFormSchema) as Resolver<ServiceVisitFormValues>,
        defaultValues: serviceVisitFormDefaultValues,
    });

    useEffect(() => {
        if (!isEdit || !report) return;
        form.reset({
            visitDate: report.visitDate ?? "",
            resolutionDone: report.resolutionDone ?? undefined,
            remarks: report.remarks,
        });
        if (report.resolvedPhoto && report.resolvedPhoto.length > 0) {
            setResolvedPhotoPaths(report.resolvedPhoto);
        }
        if (report.signedPhoto && report.signedPhoto.length > 0) {
            setSignedPhotoPaths(report.signedPhoto);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, report]);

    const saving = createReport.isPending || updateReport.isPending;

    const onSubmit = async (values: ServiceVisitFormValues) => {
        if (!complaintId) return;

        const payload: CreateServiceVisitReportDto = {
            complaintId,
            remarks: values.remarks,
            resolutionDone: values.resolutionDone ?? null,
            visitDate: values.visitDate ? new Date(values.visitDate).toISOString() : null,
            resolvedPhoto: resolvedPhotoPaths.length > 0 ? resolvedPhotoPaths : [],
            signedPhoto: signedPhotoPaths.length > 0 ? signedPhotoPaths : [],
        };

        try {
            if (isEdit && reportId) {
                await updateReport.mutateAsync({ id: reportId, data: payload });
            } else {
                await createReport.mutateAsync(payload);
            }
            navigate(paths.services.visit);
        } catch {
            // handled by hooks
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b bg-muted/30">
                        <h2 className="text-base font-semibold">{isEdit ? "Edit Service Visit Report" : "Create Service Visit Report"}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Fill in the service visit details and save.</p>
                    </div>

                    {/* Visit Date & Time */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visit Details</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper<ServiceVisitFormValues, "visitDate"> control={form.control} name="visitDate" label="Visit Date and Time">
                                {field => <DateTimeInput value={field.value ?? ""} onChange={field.onChange} disabled={saving} />}
                            </FieldWrapper>
                            <FieldWrapper<ServiceVisitFormValues, "resolutionDone"> control={form.control} name="resolutionDone" label="Resolution Done">
                                {field => (
                                    <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex gap-6 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="1" id="res-done-yes" />
                                            <Label htmlFor="res-done-yes">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="0" id="res-done-no" />
                                            <Label htmlFor="res-done-no">No</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            </FieldWrapper>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remarks</p>
                        </div>
                        <FieldWrapper<ServiceVisitFormValues, "remarks"> control={form.control} name="remarks" label="Remarks / Reason for non-resolution *">
                            {field => (
                                <Textarea
                                    className={inputCls + " min-h-[120px]"}
                                    placeholder="Describe the work done at the site or the reason for non-resolution..."
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* Upload photo after resolution */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photo After Resolution</p>
                        </div>
                        <FileUploader
                            context="customer-attachments"
                            value={resolvedPhotoPaths.map(p => p.path)}
                            onChange={paths => setResolvedPhotoPaths(paths.map(p => ({ path: p })))}
                            disabled={saving}
                            label="Upload photo after resolution"
                        />
                    </div>

                    {/* Upload customer-signed visit report */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer-Signed Visit Report</p>
                        </div>
                        <FileUploader
                            context="customer-attachments"
                            value={signedPhotoPaths.map(p => p.path)}
                            onChange={paths => setSignedPhotoPaths(paths.map(p => ({ path: p })))}
                            disabled={saving}
                            label="Upload customer-signed visit report"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => navigate(paths.services.visit)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isEdit ? "Update Report" : "Save Report"}
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </Form>
    );
}
