import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPinned, FileText, User } from "lucide-react";
import { Page5FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import type { Page5FormValues, PageFormProps } from "../../helpers/woDetail.types";

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
            siteVisitNeeded: false,
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

    const DocumentList = ({
        title,
        icon: Icon,
        documents,
        setDocuments,
        color,
    }: {
        title: string;
        icon: any;
        documents: string[];
        setDocuments: (docs: string[]) => void;
        color: string;
    }) => (
        <Card>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-${color}-600`}>
                    <Icon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input
                            value={doc}
                            onChange={(e) => {
                                const updated = [...documents];
                                updated[index] = e.target.value;
                                setDocuments(updated);
                            }}
                            placeholder="Document name"
                            className="flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setDocuments(documents.filter((_, i) => i !== index))}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDocuments([...documents, ""])}
                >
                    <Plus className="h-4 w-4 mr-2" />
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
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPinned className="h-5 w-5 text-orange-500" />
                            Site Visit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="siteVisitNeeded" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="siteVisitNeeded"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="siteVisitNeeded">Site Visit Needed</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchSiteVisitNeeded && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg border space-y-4">
                                <h4 className="font-medium flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Proposed Person for Site Visit
                                </h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.name"
                                        label="Name"
                                    >
                                        {(field) => <Input {...field} placeholder="Full name" />}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.phone"
                                        label="Phone No."
                                    >
                                        {(field) => <Input {...field} placeholder="+91 XXXXX XXXXX" />}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="siteVisitPerson.email"
                                        label="Email ID"
                                    >
                                        {(field) => (
                                            <Input {...field} type="email" placeholder="email@example.com" />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Product/Document Approval Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                            Product/Document Approval (Documents needed from OEM)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-3">
                            <DocumentList
                                title="Documents Available (from Tendering)"
                                icon={FileText}
                                documents={docsFromTendering}
                                setDocuments={setDocsFromTendering}
                                color="green"
                            />
                            <DocumentList
                                title="Documents Needed"
                                icon={FileText}
                                documents={docsNeeded}
                                setDocuments={setDocsNeeded}
                                color="yellow"
                            />
                            <DocumentList
                                title="Documents to Create In-House"
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

// Add missing imports at top
import { useState, useEffect } from "react";
