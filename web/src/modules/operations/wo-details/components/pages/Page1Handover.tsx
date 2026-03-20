import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, FileCheck } from "lucide-react";
import { Page1FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { DEPARTMENTS, TENDER_CHECKLIST_ITEMS, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { SelectField } from "@/components/form/SelectField";
import type { Page1FormValues, Contact, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page1HandoverProps extends PageFormProps {
    initialData?: {
        contacts: Contact[];
        tenderDocumentsChecklist: Record<string, boolean>;
    };
    tenderContacts?: Contact[];
}

export function Page1Handover({
    initialData,
    tenderContacts = [],
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page1HandoverProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);

    const form = useForm<Page1FormValues>({
        resolver: zodResolver(Page1FormSchema) as Resolver<Page1FormValues>,
        defaultValues: {
            contacts: [],
            tenderDocumentsChecklist: {
                completeTenderDocuments: 'false',
                tenderInfo: 'false',
                emdInformation: 'false',
                physicalDocumentsSubmission: 'false',
                rfqAndQuotation: 'false',
                documentChecklist: 'false',
                costingSheet: 'false',
                result: 'false',
            },
        },
    });

    // Initialize contacts from tender or existing data
    useEffect(() => {
        if (initialData?.contacts?.length) {
            setContacts(initialData.contacts);
        } else if (tenderContacts.length > 0) {
            setContacts(tenderContacts);
        }

        if (initialData?.tenderDocumentsChecklist) {
            form.setValue("tenderDocumentsChecklist", initialData.tenderDocumentsChecklist);
        }
    }, [initialData, tenderContacts, form]);

    // Sync contacts with form
    useEffect(() => {
        form.setValue("contacts", contacts);
    }, [contacts, form]);

    const handleAddContact = () => {
        setContacts([
            ...contacts,
            { name: "", designation: "", phone: "", email: "", organization: "", departments: undefined },
        ]);
    };

    const handleRemoveContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index));
    };

    const handleUpdateContact = (index: number, field: keyof Contact, value: string) => {
        const updated = [...contacts];
        updated[index] = { ...updated[index], [field]: value };
        setContacts(updated);
    };

    const handleFormSubmit = async (values: Page1FormValues) => {
        // Check if checklist is incomplete
        const checklist = values.tenderDocumentsChecklist;
        const incompleteItems = TENDER_CHECKLIST_ITEMS.filter(
            (item) => !checklist[item.key as keyof typeof checklist]
        );

        if (incompleteItems.length > 0) {
            // TODO: Trigger email notification to Tendering TL and TE
            console.log("Incomplete items:", incompleteItems.map((i) => i.label));
        }

        // TODO: Call API to save page 1 data
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        // TODO: Call API to save draft
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Client Details Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-500" />
                            Client Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Organization</th>
                                        <th className="p-3 text-left">Department</th>
                                        <th className="p-3 text-left">Name*</th>
                                        <th className="p-3 text-left">Designation</th>
                                        <th className="p-3 text-left">Phone</th>
                                        <th className="p-3 text-left">Email</th>
                                        <th className="p-3 text-left w-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {contacts.map((contact, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2">
                                                <Input
                                                    value={contact.organization || ""}
                                                    onChange={(e) => handleUpdateContact(idx, "organization", e.target.value)}
                                                    placeholder="Organization"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <SelectField
                                                    name={`contacts.${idx}.departments`}
                                                    control={form.control}
                                                    options={DEPARTMENTS.map((dept) => ({ label: dept, value: dept }))}
                                                    placeholder="Select"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={contact.name || ""}
                                                    onChange={(e) => handleUpdateContact(idx, "name", e.target.value)}
                                                    placeholder="Name"
                                                    className="h-8 text-xs"
                                                    required
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={contact.designation || ""}
                                                    onChange={(e) => handleUpdateContact(idx, "designation", e.target.value)}
                                                    placeholder="Designation"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={contact.phone || ""}
                                                    onChange={(e) => handleUpdateContact(idx, "phone", e.target.value)}
                                                    placeholder="Phone"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={contact.email || ""}
                                                    onChange={(e) => handleUpdateContact(idx, "email", e.target.value)}
                                                    placeholder="Email"
                                                    type="email"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type="button"
                                                    onClick={() => handleRemoveContact(idx)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {contacts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                                No contacts. Add one using the button below.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={handleAddContact}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Contact
                        </Button>
                        {form.formState.errors.contacts && (
                            <p className="text-sm text-destructive mt-2">
                                {form.formState.errors.contacts.message}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Tender Documents Checklist Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-orange-500" />
                            Tender Team Document Handover Checklist
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            If any item is not selected, a notification will be sent to the Tendering TL and the respective TE.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-6 bg-muted/5 rounded-xl border border-dashed">
                            {TENDER_CHECKLIST_ITEMS.map((item) => (
                                <SelectField
                                    key={item.key}
                                    control={form.control}
                                    name={`tenderDocumentsChecklist.${item.key}` as any}
                                    label={item.label}
                                    options={YES_NO_OPTIONS as any}
                                    placeholder="Select"
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={1}
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
