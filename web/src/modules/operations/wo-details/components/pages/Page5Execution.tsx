import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/form/SelectField";
import { Plus, Trash2, MapPinned, FileText, User } from "lucide-react";
import { Page5FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import type { Page5FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page5ExecutionProps extends PageFormProps {
    initialData?: Partial<Page5FormValues>;
}

export function Page5Execution({
    initialData,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page5ExecutionProps) {
    const form = useForm<Page5FormValues>({
        resolver: zodResolver(Page5FormSchema) as Resolver<Page5FormValues>,
        defaultValues: {
            siteVisitNeeded: 'false',
            siteVisitPerson: { name: "", phone: "", email: "" },
            documentsFromTendering: [],
            documentsNeeded: [],
            documentsInHouse: [],
            ...initialData,
        },
    });

    const watchSiteVisitNeeded = form.watch("siteVisitNeeded");

    // Document arrays state
    const [docsFromTendering, setDocsFromTendering] = useState<string[]>(
        initialData?.documentsFromTendering || []
    );
    const [docsNeeded, setDocsNeeded] = useState<string[]>(
        initialData?.documentsNeeded || []
    );
    const [docsInHouse, setDocsInHouse] = useState<string[]>(
        initialData?.documentsInHouse || []
    );

    // Sync with form
    useEffect(() => {
        form.setValue("documentsFromTendering", docsFromTendering);
        form.setValue("documentsNeeded", docsNeeded);
        form.setValue("documentsInHouse", docsInHouse);
    }, [docsFromTendering, docsNeeded, docsInHouse, form]);

    const handleFormSubmit = async (values: Page5FormValues) => {
        console.log("Page 5 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        console.log("Save draft:", values);
    };

    const DocumentList = ({ title, icon: Icon, documents, setDocuments, color }: { title: string; icon: any; documents: string[]; setDocuments: (docs: string[]) => void; color: string; }) => (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className={`flex items-center gap-2 text-sm font-semibold text-${color}-600`}>
                    <Icon className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {documents.map((doc, index) => (
                    <div key={index} className="group flex items-center gap-2">
                        <Input
                            value={doc}
                            onChange={(e) => {
                                const updated = [...documents];
                                updated[index] = e.target.value;
                                setDocuments(updated);
                            }}
                            placeholder="Document name"
                            className="flex-1 h-9"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setDocuments(documents.filter((_, i) => i !== index))}
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
                    onClick={() => setDocuments([...documents, ""])}
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
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />
                        </div>

                        {watchSiteVisitNeeded === 'true' && (
                            <div className="bg-muted/5 p-6 rounded-xl border border-dashed space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    Proposed Contact Person
                                </h4>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.name"
                                        label="Full Name"
                                    >
                                        {(field) => <Input {...field} placeholder="John Doe" />}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.phone"
                                        label="Phone Number"
                                    >
                                        {(field) => <Input {...field} placeholder="+91 XXXXX XXXXX" />}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.email"
                                        label="Email Address"
                                    >
                                        {(field) => (
                                            <Input {...field} type="email" placeholder="john@example.com" />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Product/Document Approval Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                            Documentation & OEM Approvals
                        </CardTitle>
                        <CardDescription>Identify documents that need to be collected or prepared for project approval.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <DocumentList
                                title="Available from Tendering"
                                icon={FileText}
                                documents={docsFromTendering}
                                setDocuments={setDocsFromTendering}
                                color="green"
                            />
                            <DocumentList
                                title="Additional Documents Needed"
                                icon={FileText}
                                documents={docsNeeded}
                                setDocuments={setDocsNeeded}
                                color="yellow"
                            />
                            <DocumentList
                                title="To be Created In-House"
                                icon={FileText}
                                documents={docsInHouse}
                                setDocuments={setDocsInHouse}
                                color="blue"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={5}
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
