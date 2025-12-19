import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useCreateVendorOrganizationWithRelations } from '@/hooks/api/useVendorOrganizations';
import { paths } from '@/app/routes/paths';
import { GstSection } from './components/GstSection';
import { AccountSection } from './components/AccountSection';
import { PersonSection } from './components/PersonSection';
import { FileSection } from './components/FileSection';
import { Plus } from 'lucide-react';

const VendorFormSchema = z.object({
    organization: z.object({
        name: z.string().min(1, 'Organization name is required').max(255),
        address: z.string().max(500).optional(),
        status: z.boolean().default(true),
    }),
    gsts: z
        .array(
            z.object({
                gstState: z.string().min(1, 'GST state is required'),
                gstNum: z.string().min(1, 'GST number is required'),
                status: z.boolean().default(true),
            }),
        )
        .optional()
        .default([]),
    accounts: z
        .array(
            z.object({
                accountName: z.string().min(1, 'Account name is required'),
                accountNum: z.string().min(1, 'Account number is required'),
                accountIfsc: z.string().min(1, 'IFSC code is required'),
                status: z.boolean().default(true),
            }),
        )
        .optional()
        .default([]),
    persons: z
        .array(
            z.object({
                name: z.string().min(1, 'Person name is required'),
                email: z.string().email('Invalid email').optional().or(z.literal('')),
                address: z.string().optional(),
                status: z.boolean().default(true),
                files: z
                    .array(
                        z.object({
                            name: z.string().min(1, 'File name is required'),
                            filePath: z.string().min(1, 'File path is required'),
                            status: z.boolean().default(true),
                        }),
                    )
                    .optional()
                    .default([]),
            }),
        )
        .optional()
        .default([]),
    files: z
        .array(
            z.object({
                personIndex: z.number().min(0),
                name: z.string().min(1, 'File name is required'),
                filePath: z.string().min(1, 'File path is required'),
                status: z.boolean().default(true),
            }),
        )
        .optional()
        .default([]),
});

type VendorFormValues = z.infer<typeof VendorFormSchema>;

const CreateVendorPage = () => {
    const navigate = useNavigate();
    const createVendor = useCreateVendorOrganizationWithRelations();

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema),
        defaultValues: {
            organization: {
                name: '',
                address: '',
                status: true,
            },
            gsts: [],
            accounts: [],
            persons: [],
            files: [],
        },
    });

    const handleSubmit = async (values: VendorFormValues) => {
        try {
            // Transform files to attach to persons
            const personsWithFiles = values.persons.map((person, index) => {
                const personFiles = values.files
                    .filter((file) => file.personIndex === index)
                    .map((file) => ({
                        name: file.name,
                        filePath: file.filePath,
                        status: file.status,
                    }));

                return {
                    ...person,
                    files: [...(person.files || []), ...personFiles],
                };
            });

            const payload = {
                organization: values.organization,
                gsts: values.gsts || [],
                accounts: values.accounts || [],
                persons: personsWithFiles,
            };

            await createVendor.mutateAsync(payload);
            navigate(paths.master.vendors);
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create Vendor Organization</h1>
                    <p className="text-muted-foreground mt-2">
                        Add a new vendor organization with GST, accounts, persons, and files
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(paths.master.vendors)}>
                    Cancel
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Organization Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="organization.name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter organization name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="organization.address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter organization address"
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="organization.status"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* GST Section */}
                    <GstSection />

                    {/* Account Section */}
                    <AccountSection />

                    {/* Person Section */}
                    <PersonSection />

                    {/* File Section */}
                    <FileSection />

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(paths.master.vendors)}
                            disabled={createVendor.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createVendor.isPending}>
                            {createVendor.isPending ? 'Creating...' : 'Create Vendor Organization'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default CreateVendorPage;
