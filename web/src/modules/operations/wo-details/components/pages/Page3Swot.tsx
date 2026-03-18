import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from "lucide-react";
import { Page3FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import type { Page3FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page3SwotProps extends PageFormProps {
    initialData?: Partial<Page3FormValues>;
}

export function Page3Swot({
    initialData,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page3SwotProps) {
    const form = useForm<Page3FormValues>({
        resolver: zodResolver(Page3FormSchema),
        defaultValues: {
            swotStrengths: "",
            swotWeaknesses: "",
            swotOpportunities: "",
            swotThreats: "",
            ...initialData,
        },
    });

    const handleFormSubmit = async (values: Page3FormValues) => {
        // TODO: Call API to save page 3 data
        console.log("Page 3 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>SWOT Analysis of the Tender</CardTitle>
                        <CardDescription>
                            All fields are optional. Provide analysis to help with project planning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Strengths */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-600">
                                    <TrendingUp className="h-5 w-5" />
                                    <h3 className="font-semibold">Strengths of VE</h3>
                                </div>
                                <FieldWrapper control={form.control} name="swotStrengths" label="">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are VE's strengths in this project?"
                                            className="min-h-[150px] border-green-200 focus:border-green-500"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            {/* Weaknesses */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-600">
                                    <TrendingDown className="h-5 w-5" />
                                    <h3 className="font-semibold">Weaknesses of VE</h3>
                                </div>
                                <FieldWrapper control={form.control} name="swotWeaknesses" label="">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are VE's weaknesses in this project?"
                                            className="min-h-[150px] border-red-200 focus:border-red-500"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            {/* Opportunities */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Lightbulb className="h-5 w-5" />
                                    <h3 className="font-semibold">Opportunities for VE</h3>
                                </div>
                                <FieldWrapper control={form.control} name="swotOpportunities" label="">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What opportunities exist in this project?"
                                            className="min-h-[150px] border-blue-200 focus:border-blue-500"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            {/* Threats */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-yellow-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <h3 className="font-semibold">Threats/Risks in the Project</h3>
                                </div>
                                <FieldWrapper control={form.control} name="swotThreats" label="">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are the threats or risks in this project?"
                                            className="min-h-[150px] border-yellow-200 focus:border-yellow-500"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={3}
                    totalPages={7}
                    canSkip={true}
                    isSubmitting={isLoading}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
