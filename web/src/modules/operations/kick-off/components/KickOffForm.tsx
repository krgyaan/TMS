import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBulkWoContacts, useDeleteAllContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { useSaveKickoffMeeting } from '@/hooks/api/useKickoffMeeting';
import type { Department } from '@/modules/operations/types/wo.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactSchema, KickoffFormSchema, type ContactValues, type KickoffFormValues } from '../helpers/kickOff.schema';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const departmentOptions = [
    { label: 'EIC', value: 'EIC' },
    { label: 'User', value: 'User' },
    { label: 'C&P', value: 'C&P' },
    { label: 'Finance', value: 'Finance' },
];

interface WoKickoffMeetingProps {
    kickoffData: any;
    woContactsData: any;
    woDetailId: number;
    woBasicDetailId: number;
    organizationName?: string;
}

export function WoKickoffMeeting({ kickoffData, woContactsData, woDetailId, woBasicDetailId, organizationName }: WoKickoffMeetingProps) {
    const navigate = useNavigate();
    const saveKickoffMutation = useSaveKickoffMeeting();
    const bulkCreateContacts = useCreateBulkWoContacts();
    const deleteAllContacts = useDeleteAllContactsByBasicDetail();

    const [contacts, setContacts] = useState<ContactValues[]>([]);

    const form = useForm<KickoffFormValues>({
        resolver: zodResolver(KickoffFormSchema),
        defaultValues: {
            meetingDate: '',
            meetingLink: '',
        },
    });

    useEffect(() => {
        if (kickoffData) {
            form.reset({
                meetingDate: kickoffData.meetingDate ? formatDateTime(kickoffData.meetingDate) : '',
                meetingLink: kickoffData.meetingLink || '',
            });
        }
    }, [kickoffData, form]);

    useEffect(() => {
        if (woContactsData && Array.isArray(woContactsData)) {
            setContacts(
                woContactsData.map((c: any) => ({
                    id: c.id,
                    organization: c.organization || '',
                    departments: c.departments || '',
                    name: c.name || '',
                    designation: c.designation || '',
                    phone: c.phone || '',
                    email: c.email || '',
                }))
            );
        } else {
            setContacts([]);
        }
    }, [woContactsData]);

    const handleAddContact = () => {
        setContacts([
            ...contacts,
            {
                organization: organizationName || '',
                departments: '',
                name: '',
                designation: '',
                phone: '',
                email: '',
            },
        ]);
    };

    const handleRemoveContact = (idx: number) => {
        setContacts(contacts.filter((_, i) => i !== idx));
    };

    const handleUpdateContact = (idx: number, field: keyof ContactValues, value: string) => {
        const newContacts = [...contacts];
        newContacts[idx] = { ...newContacts[idx], [field]: value };
        setContacts(newContacts);
    };

    const isSubmitting = saveKickoffMutation.isPending || bulkCreateContacts.isPending || deleteAllContacts.isPending;

    const handleSubmit: SubmitHandler<KickoffFormValues> = async (values) => {
        try {
            // Validate contacts manually
            for (let i = 0; i < contacts.length; i++) {
                ContactSchema.parse(contacts[i]);
            }

            // Save meeting details
            await saveKickoffMutation.mutateAsync({
                woDetailId,
                meetingDate: values.meetingDate ? new Date(values.meetingDate).toISOString() : null,
                meetingLink: values.meetingLink || null,
            });

            // Sync contacts: deleting old and inserting new list
            await deleteAllContacts.mutateAsync(woBasicDetailId);
            if (contacts.length > 0) {
                await bulkCreateContacts.mutateAsync({
                    woBasicDetailId: woBasicDetailId,
                    contacts: contacts.map((c) => ({
                        organization: c.organization || undefined,
                        departments: (c.departments as Department) || undefined,
                        name: c.name,
                        designation: c.designation || undefined,
                        phone: c.phone || undefined,
                        email: c.email || undefined,
                    })),
                });
            }

            toast.success('Kick-off meeting scheduled successfully');
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                toast.error('Please check contact details for errors');
            } else {
                toast.error(error?.message || 'Failed to schedule meeting');
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Initiate Kick-off Meeting</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Meeting Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="meetingDate" label="Meeting Date and Time">
                                {(field) => (
                                    <Input
                                        type="datetime-local"
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="meetingLink" label="Google Meet Link">
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="url"
                                        placeholder="https://meet.google.com/..."
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        {/* Contacts Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold">Client Details</h3>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Contact
                                </Button>
                            </div>

                            <div className="border rounded-md overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 text-left">Organization</th>
                                            <th className="p-2 text-left min-w-[120px]">Department</th>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Designation</th>
                                            <th className="p-2 text-left">Phone</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {contacts.map((contact, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 min-w-[150px]">
                                                    <Input
                                                        value={contact.organization || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'organization', e.target.value)}
                                                        placeholder="Organization..."
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 min-w-[120px]">
                                                    <select
                                                        value={contact.departments || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'departments', e.target.value)}
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background outline-none focus:ring-2 focus:ring-ring"
                                                    >
                                                        <option value="" disabled>Select...</option>
                                                        {departmentOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2 min-w-[120px]">
                                                    <Input
                                                        value={contact.name || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'name', e.target.value)}
                                                        placeholder="Name..."
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 min-w-[120px]">
                                                    <Input
                                                        value={contact.designation || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'designation', e.target.value)}
                                                        placeholder="Desig..."
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 min-w-[120px]">
                                                    <Input
                                                        value={contact.phone || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'phone', e.target.value)}
                                                        placeholder="Phone..."
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 min-w-[150px]">
                                                    <Input
                                                        value={contact.email || ''}
                                                        onChange={(e) => handleUpdateContact(idx, 'email', e.target.value)}
                                                        placeholder="Email..."
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        onClick={() => handleRemoveContact(idx)}
                                                        className="text-destructive h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {contacts.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                                    No client details added. Add one above.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(paths.operations.woKickOffListPage)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save & Initiate'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
