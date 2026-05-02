import { useEffect } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MapPinned, FileText, User } from "lucide-react";

import { Page5FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { YES_NO_OPTIONS, WIZARD_CONFIG } from "@/modules/operations/wo-details/helpers/constants";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave } from "@/hooks/api/useWoDetails";

import type { Page5FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page5ExecutionProps extends PageFormProps {
    initialData?: Partial<Page5FormValues>;
}

const defaultValues: Page5FormValues = {
    siteVisitNeeded: "false",
    siteVisitPerson: { name: "", phone: "", email: "" },
    documentsFromTendering: [],
    documentsNeeded: [],
    documentsInHouse: [],
};

export function Page5Execution({
    woDetailId,
    initialData,
    onSubmit,
    onSkip,
    onBack,
    onSaveDraft,
    isLoading,
    isSaving,
}: Page5ExecutionProps) {
    const form = useForm<Page5FormValues>({
        resolver: zodResolver(Page5FormSchema) as Resolver<Page5FormValues>,
        defaultValues: { ...defaultValues, ...initialData },
    });

    const {
        fields: docsFromTenderingFields,
        append: appendDocFromTendering,
        remove: removeDocFromTendering,
    } = useFieldArray({ control: form.control, name: "documentsFromTendering" as any });

    const {
        fields: docsNeededFields,
        append: appendDocNeeded,
        remove: removeDocNeeded,
    } = useFieldArray({ control: form.control, name: "documentsNeeded" as any });

    const {
        fields: docsInHouseFields,
        append: appendDocInHouse,
        remove: removeDocInHouse,
    } = useFieldArray({ control: form.control, name: "documentsInHouse" as any });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 5);

    const watchSiteVisitNeeded = form.watch("siteVisitNeeded");

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({ ...defaultValues, ...initialData });
        }
    }, [initialData, form]);

    const handleFormSubmit = async (values: Page5FormValues) => {
        await onSubmit(values);
    };

    const handleSaveDraft = async () => {
        await onSaveDraft(form.getValues());
    };

    const DocumentList = ({
        title,
        icon: Icon,
        fields,
        namePrefix,
        onAdd,
        onRemove,
        color,
    }: {
        title: string;
        icon: React.ElementType;
        fields: any[];
        namePrefix: string;
        onAdd: () => void;
        onRemove: (index: number) => void;
        color: string;
    }) => (
        <Card>
            <CardHeader className="border-b py-3">
                <CardTitle className={`flex items-center gap-2 text-sm font-semibold text-${color}-600`}>
                    <Icon className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id || index} className="group flex items-center gap-2">
                        <FormField
                            control={form.control}
                            name={`${namePrefix}.${index}` as any}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input {...field} placeholder="Document name" className="h-9" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => onRemove(index)}
                            className="text-destructive h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground hover:text-primary"
                    onClick={onAdd}
                >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Document
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Site Visit Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <MapPinned className="h-5 w-5 text-orange-500" />
                            Site Visit Assessment
                        </CardTitle>
                        <CardDescription>Determine if a site visit is necessary for project execution.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="max-w-xs">
                            <SelectField
                                control={form.control}
                                name="siteVisitNeeded"
                                label="Site Visit Required?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />
                        </div>

                        {watchSiteVisitNeeded === "true" && (
                            <div className="bg-muted/5 p-6 rounded-xl border border-dashed space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    Proposed Contact Person
                                </h4>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="siteVisitPerson.name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="John Doe" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="siteVisitPerson.phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="+91 XXXXX XXXXX" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="siteVisitPerson.email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="email" placeholder="john@example.com" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Documentation Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                            Documentation & OEM Approvals
                        </CardTitle>
                        <CardDescription>Identify documents that need to be collected or prepared.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <DocumentList
                                title="Available from Tendering"
                                icon={FileText}
                                fields={docsFromTenderingFields}
                                namePrefix="documentsFromTendering"
                                onAdd={() => appendDocFromTendering("" as any)}
                                onRemove={removeDocFromTendering}
                                color="green"
                            />
                            <DocumentList
                                title="Additional Documents Needed"
                                icon={FileText}
                                fields={docsNeededFields}
                                namePrefix="documentsNeeded"
                                onAdd={() => appendDocNeeded("" as any)}
                                onRemove={removeDocNeeded}
                                color="yellow"
                            />
                            <DocumentList
                                title="To be Created In-House"
                                icon={FileText}
                                fields={docsInHouseFields}
                                namePrefix="documentsInHouse"
                                onAdd={() => appendDocInHouse("" as any)}
                                onRemove={removeDocInHouse}
                                color="blue"
                            />
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={5}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={true}
                    isSubmitting={isLoading}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
