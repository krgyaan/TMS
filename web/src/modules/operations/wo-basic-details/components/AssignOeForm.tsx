import { useMemo, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { AssignOeFormSchema } from "@/modules/operations/wo-basic-details/helpers/basiDetail.schema";
import type { WoBasicDetail, AssignOeFormValues, AssignOeDto } from "@/modules/operations/wo-basic-details/helpers/basiDetail.types";
import { buildDefaultAssigeOeValues, mapFormToAssignOePayload } from "@/modules/operations/wo-basic-details/helpers/basiDetail.mapper";
import { useAssignOe } from "@/hooks/api/useWoBasicDetails";
import { toast } from "sonner";
import SelectField from "@/components/form/SelectField";
import type { User } from "@/types/api.types";

interface AssignOeFormProps {
    mode: "create" | "edit";
    existingData?: WoBasicDetail;
    users?: User[];
}

export function AssignOeForm({ mode, existingData, users }: AssignOeFormProps) {
    const navigate = useNavigate();
    const { id: woBasicDetailsId } = useParams<{ id: string }>();
    const assignOeMutation = useAssignOe();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapFormToAssignOePayload(existingData);
        }
        const defaults = buildDefaultAssigeOeValues();
        if (woBasicDetailsId) {
            defaults.woBasicDetailId = Number(woBasicDetailsId);
        }
        return defaults;
    }, [mode, existingData, woBasicDetailsId]);

    const form = useForm<AssignOeFormValues>({
        resolver: zodResolver(AssignOeFormSchema) as Resolver<AssignOeFormValues>,
        defaultValues: initialValues,
    });

    // Reset form when initialValues change (e.g., when existingData loads)
    useEffect(() => {
        form.reset(initialValues);
    }, [initialValues, form]);

    const isSubmitting = assignOeMutation.isPending;

    const handleSubmit: SubmitHandler<AssignOeFormValues> = async values => {
        console.log("Submitting values:", values);

        try {
            const payload = mapFormToAssignOePayload(values) as AssignOeDto;
            const targetId = Number(payload.woBasicDetailId) || existingData?.id;

            if (!targetId) {
                toast.error("Missing WO Basic Detail ID");
                return;
            }

            await assignOeMutation.mutateAsync({ id: targetId, data: payload });

            toast.success("OE assignments saved successfully");

            // Navigate back to list or stay on page
            navigate(paths.operations.woBasicDetailListPage);

        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error?.message || "Failed to save OE assignments");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            Assign OEs to {existingData?.projectName || existingData?.woNumber}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === "create"
                                ? "Assign OEs for this Work Order"
                                : "Update OE assignments for this Work Order"}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-3 items-start">
                            <SelectField
                                control={form.control}
                                name="oeFirst"
                                label="Primary OE"
                                placeholder="Select Primary OE"
                                options={users?.map(user => ({
                                    value: String(user.id),
                                    label: user.name
                                })) ?? []}
                            />
                            <SelectField
                                control={form.control}
                                name="oeDocsPrep"
                                label="OE Docs Prep"
                                placeholder="Select OE Docs Prep"
                                options={users?.map(user => ({
                                    value: String(user.id),
                                    label: user.name
                                })) ?? []}
                            />
                            <SelectField
                                control={form.control}
                                name="oeSiteVisit"
                                label="OE Site Visit"
                                placeholder="Select OE Site Visit"
                                options={users?.map(user => ({
                                    value: String(user.id),
                                    label: user.name
                                })) ?? []}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(initialValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === "create" ? "Assign" : "Update"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default AssignOeForm;
