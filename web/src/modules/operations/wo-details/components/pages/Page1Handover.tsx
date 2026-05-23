import { useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, FileCheck } from "lucide-react";
import { Page1FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { DEPARTMENT_OPTIONS, TENDER_CHECKLIST_ITEMS, YES_NO_OPTIONS, WIZARD_CONFIG } from "@/modules/operations/wo-details/helpers/constants";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave } from "@/hooks/api/useWoDetails";

import type {
    Page1FormValues,
    PageFormProps,
    Contact,
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
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                                        <th className="p-3 text-left w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {contactFields.map((field, idx) => (
                                        <tr key={field.id}>
                                            <td className="p-2">
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
                                            <td className="p-2">
                                                <SelectField
                                                    control={form.control}
                                                    name={`contacts.${idx}.departments`}
                                                    options={DEPARTMENT_OPTIONS}
                                                    placeholder="Select"
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-2">
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
                                            <td className="p-2">
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
                                            <td className="p-2">
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
                                            <td className="p-2">
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
                                            <td className="p-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type="button"
                                                    onClick={() => removeContact(idx)}
                                                    disabled={contactFields.length === 1}
                                                    className="text-destructive hover:text-destructive"
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
                            className="mt-4"
                            onClick={() => appendContact(defaultContact)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Contact
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-orange-500" />
                            Tender Team Document Handover Checklist
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            If any item is not selected, a notification will be sent to the Tendering TL and TE.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-6 bg-muted/5 rounded-xl border border-dashed">
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
