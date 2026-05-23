import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { DEPARTMENT_OPTIONS, TENDER_CHECKLIST_ITEMS, WIZARD_CONFIG, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { Page1FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheck, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import type {
    Contact,
    Page1FormValues,
    PageFormProps,
} from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page1HandoverProps extends PageFormProps {
    initialData?: Partial<Page1FormValues>;
}

const defaultContact: Contact = {
    name: "",
    designation: "",
    phone: "",
    email: "",
    organization: "",
    departments: undefined,
};

const defaultChecklist: Page1FormValues["tenderDocumentsChecklist"] = {
    completeTenderDocuments: "false",
    tenderInfo: "false",
    emdInformation: "false",
    physicalDocumentsSubmission: "false",
    rfqAndQuotation: "false",
    documentChecklist: "false",
    costingSheet: "false",
    result: "false",
};

export function Page1Handover({
    woDetailId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page1HandoverProps) {
    const form = useForm<Page1FormValues>({
        resolver: zodResolver(Page1FormSchema),
        defaultValues: {
            contacts: initialData?.contacts?.length ? initialData.contacts : [defaultContact],
            tenderDocumentsChecklist: initialData?.tenderDocumentsChecklist || defaultChecklist,
        },
    });

    const {
        fields: contactFields,
        append: appendContact,
        remove: removeContact,
    } = useFieldArray({
        control: form.control,
        name: "contacts",
    });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 1);

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({
                contacts: initialData.contacts?.length ? initialData.contacts : [defaultContact],
                tenderDocumentsChecklist: initialData.tenderDocumentsChecklist || defaultChecklist,
            });
        }
    }, [initialData, form]);

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

    return (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            Project Handover
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                Client Contacts
                            </h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 text-left">Organization</th>
                                            <th className="p-2 text-left">Department</th>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Designation</th>
                                            <th className="p-2 text-left">Phone</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {contactFields.map((field, idx) => (
                                            <tr key={field.id}>
                                                <td className="p-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`contacts.${idx}.organization`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Organization" className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <SelectField
                                                        control={form.control}
                                                        name={`contacts.${idx}.departments`}
                                                        options={DEPARTMENT_OPTIONS}
                                                        placeholder="Select"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`contacts.${idx}.name`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Name" className="h-8 text-xs" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`contacts.${idx}.designation`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Designation" className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`contacts.${idx}.phone`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Phone" className="h-8 text-xs" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`contacts.${idx}.email`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Email" type="email" className="h-8 text-xs" />
                                                                </FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => removeContact(idx)}
                                                        disabled={contactFields.length === 1}
                                                        className="text-destructive hover:text-destructive h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => appendContact(defaultContact)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Contact
                            </Button>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <FileCheck className="h-4 w-4 text-muted-foreground" />
                                Tender Team Document Handover Checklist
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                If any item is not selected, a notification will be sent to the Tendering TL and TE.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/5 rounded-lg border border-dashed">
                                {TENDER_CHECKLIST_ITEMS.map((item) => (
                                    <SelectField
                                        key={item.key}
                                        control={form.control}
                                        name={`tenderDocumentsChecklist.${item.key}`}
                                        label={item.label}
                                        options={YES_NO_OPTIONS}
                                        placeholder="Select"
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={1}
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
