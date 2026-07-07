import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileText, FolderOpen, MapPinned, Plus, Trash2, User } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { ConditionalSection } from "@/components/form/ConditionalSection";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave, useTenderConsolidatedData } from "@/hooks/api/useWoDetails";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { WIZARD_CONFIG, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { formToApi } from "@/modules/operations/wo-details/helpers/woDetail.mapper";
import { Page5FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { tenderFilesService } from "@/services/api/tender-files.service";

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
    tenderId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page5ExecutionProps) {
    const form = useForm<Page5FormValues>({
        resolver: zodResolver(Page5FormSchema) as Resolver<Page5FormValues>,
        defaultValues: { ...defaultValues, ...initialData },
    });

    const { data: consolidatedData } = useTenderConsolidatedData(Number(tenderId));

    const tenderFormDocs = consolidatedData?.tenderDocuments ?? [];
    const rfqResponseDocs = consolidatedData?.rfqResponseDocuments?.map((d) => d.path) ?? [];

    const {
        fields: docsFromTenderingFields,
        append: appendDocFromTendering,
        remove: removeDocFromTendering,
    } = useFieldArray({ control: form.control, name: "documentsFromTendering" as unknown as never });

    const {
        fields: docsNeededFields,
        append: appendDocNeeded,
        remove: removeDocNeeded,
    } = useFieldArray({ control: form.control, name: "documentsNeeded" as unknown as never });

    const {
        fields: docsInHouseFields,
        append: appendDocInHouse,
        remove: removeDocInHouse,
    } = useFieldArray({ control: form.control, name: "documentsInHouse" as unknown as never });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 5, true, 4000, formToApi.page5);

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

    useEffect(() => {
        if (watchSiteVisitNeeded !== "true") {
            form.setValue("siteVisitPerson", { name: "", phone: "", email: "" }, { shouldValidate: false });
            form.clearErrors(["siteVisitPerson.name", "siteVisitPerson.phone", "siteVisitPerson.email"]);
        }
    }, [watchSiteVisitNeeded, form]);

    const handleSaveAndContinue = useCallback(async () => {
        const errors = await onSaveDraft(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraft, form]);

    const handleSaveDraftOnly = useCallback(async () => {
        const errors = await onSaveDraftOnly(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraftOnly, form]);

    const DocumentList = ({
        title,
        icon: Icon,
        fields,
        namePrefix,
        onAdd,
        onRemove,
    }: {
        title: string;
        icon: React.ElementType;
        fields: any[];
        namePrefix: string;
        onAdd: () => void;
        onRemove: (index: number) => void;
    }) => (
        <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">{title}</h4>
            <div className="space-y-2">
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
            </div>
        </div>
    );

    return (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MapPinned className="h-5 w-5 text-muted-foreground" />
                            Project Execution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <MapPinned className="h-4 w-4 text-muted-foreground" />
                                Site Visit Assessment
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Determine if a site visit is necessary for project execution.</p>
                            <div className="max-w-xs mb-4">
                                <SelectField
                                    control={form.control}
                                    name="siteVisitNeeded"
                                    label="Site Visit Required?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>

                            <ConditionalSection show={watchSiteVisitNeeded === "true"}>
                                <div className="p-4 border border-dashed rounded-lg space-y-4">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        Proposed Contact Person
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <FieldWrapper control={form.control} name="siteVisitPerson.name" label="Full Name">
                                            {(field) => <Input {...field} placeholder="John Doe" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="siteVisitPerson.phone" label="Phone Number">
                                            {(field) => <Input {...field} placeholder="+91 XXXXX XXXXX" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="siteVisitPerson.email" label="Email Address">
                                            {(field) => <Input {...field} type="email" placeholder="john@example.com" />}
                                        </FieldWrapper>
                                    </div>
                                </div>
                            </ConditionalSection>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Documentation & OEM Approvals
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Identify documents that need to be collected or prepared.</p>

                            {(tenderFormDocs.length > 0 || rfqResponseDocs.length > 0) && (
                                <div className="mb-6 p-4 border border-dashed rounded-lg space-y-4 bg-muted/20">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        Documents from Tendering (Read-only)
                                    </h4>
                                    {tenderFormDocs.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Tender Form Documents</p>
                                            <div className="flex flex-wrap gap-2">
                                                {tenderFormDocs.map((doc, idx) => (
                                                    <Badge key={`tf-${idx}`} variant="outline" className="gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        <button
                                                            type="button"
                                                            className="hover:underline"
                                                            onClick={() => window.open(tenderFilesService.getFileUrl(doc), "_blank")}
                                                        >
                                                            {doc.split("/").pop() || doc}
                                                        </button>
                                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {rfqResponseDocs.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">RFQ Response Documents</p>
                                            <div className="flex flex-wrap gap-2">
                                                {rfqResponseDocs.map((doc, idx) => (
                                                    <Badge key={`rfq-${idx}`} variant="outline" className="gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        <button
                                                            type="button"
                                                            className="hover:underline"
                                                            onClick={() => window.open(tenderFilesService.getFileUrl(doc), "_blank")}
                                                        >
                                                            {doc.split("/").pop() || doc}
                                                        </button>
                                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid gap-6 md:grid-cols-3">
                                <DocumentList
                                    title="Available from Tendering"
                                    icon={FileText}
                                    fields={docsFromTenderingFields}
                                    namePrefix="documentsFromTendering"
                                    onAdd={() => appendDocFromTendering("" as any)}
                                    onRemove={removeDocFromTendering}
                                />
                                <DocumentList
                                    title="Additional Documents Needed"
                                    icon={FileText}
                                    fields={docsNeededFields}
                                    namePrefix="documentsNeeded"
                                    onAdd={() => appendDocNeeded("" as any)}
                                    onRemove={removeDocNeeded}
                                />
                                <DocumentList
                                    title="To be Created In-House"
                                    icon={FileText}
                                    fields={docsInHouseFields}
                                    namePrefix="documentsInHouse"
                                    onAdd={() => appendDocInHouse("" as any)}
                                    onRemove={removeDocInHouse}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={5}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={true}
                    isSubmitting={isSaving}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={handleSaveAndContinue}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraftOnly}
                />
            </form>
        </Form>
    );
}
