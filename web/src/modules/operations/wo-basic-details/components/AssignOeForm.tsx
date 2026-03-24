import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, type Resolver } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { AssignOeFormSchema } from "../helpers/basiDetail.schema";
import type { WoBasicDetail, AssignOeFormValues } from "../helpers/basiDetail.types";
import { buildDefaultValues, mapResponseToForm, mapFormToAssignOePayload } from "../helpers/basiDetail.mapper";
import { useAssignOe } from "@/hooks/api/useWoBasicDetails";
import { toast } from "sonner";
import SelectField from "@/components/form/SelectField";

interface AssignOeFormProps {
    mode: "create" | "edit";
    existingData?: WoBasicDetail;
}

export function AssignOeForm({ mode, existingData }: AssignOeFormProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlTenderId = searchParams.get("tenderId");
    const createMutation = useAssignOe();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapResponseToForm(existingData);
        }
        const defaults = buildDefaultValues();
        if (mode === "create" && urlTenderId) {
            defaults.tenderId = Number(urlTenderId);
        }
        return defaults;
    }, [mode, existingData, urlTenderId]);

    const form = useForm<AssignOeFormValues>({
        resolver: zodResolver(AssignOeFormSchema) as Resolver<AssignOeFormValues>,
        defaultValues: initialValues,
    });

    const isSubmitting = createMutation.isPending;

    const handleSubmit: SubmitHandler<AssignOeFormValues> = async values => {
        try {
            if (mode === "create") {
                const payload = mapFormToAssignOePayload(values);
                const result = await createMutation.mutateAsync(payload);
                navigate(paths.operations.woAssignOePage(result.id));
            } else if (existingData?.id) {
                const payload = mapFormToAssignOePayload(values);
                await createMutation.mutateAsync({ id: existingData.id, data: payload });
                navigate(paths.operations.woBasicDetailListPage);
            }
        } catch (error: any) {
            toast.error(error?.message || "Failed to save basic detail");
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
                                ? "Create a new OEs for WO"
                                : "Update OEs for WO"}
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
                                options={[]}
                            />
                            <SelectField
                                control={form.control}
                                name="oeDocsPrep"
                                label="OE Docs Prep"
                                placeholder="Select OE Docs Prep"
                                options={[]}
                            />
                            <SelectField
                                control={form.control}
                                name="oeSiteVisit"
                                label="OE Site Visit"
                                placeholder="Select OE Site Visit"
                                options={[]}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => form.reset(initialValues)} disabled={isSubmitting}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Submit
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default AssignOeForm;
