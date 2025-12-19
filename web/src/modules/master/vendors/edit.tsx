import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Edit, Trash2, Plus } from 'lucide-react';
import {
    useVendorOrganizationWithRelations,
    useUpdateVendorOrganizationWithRelations,
} from '@/hooks/api/useVendorOrganizations';
import {
    useCreateVendorGst,
    useUpdateVendorGst,
    useDeleteVendorGst,
} from '@/hooks/api/useVendorGsts';
import {
    useCreateVendorAccount,
    useUpdateVendorAccount,
    useDeleteVendorAccount,
} from '@/hooks/api/useVendorAccounts';
import {
    useCreateVendorFile,
    useUpdateVendorFile,
    useDeleteVendorFile,
} from '@/hooks/api/useVendorFiles';
import { useCreateVendor, useUpdateVendor } from '@/hooks/api/useVendors';
import { paths } from '@/app/routes/paths';
import { GstSection } from './components/GstSection';
import { AccountSection } from './components/AccountSection';
import { PersonSection } from './components/PersonSection';
import { FileSection } from './components/FileSection';

const VendorFormSchema = z.object({
    organization: z.object({
        name: z.string().min(1, 'Organization name is required').max(255),
        address: z.string().max(500).optional(),
        status: z.boolean().default(true),
    }),
    gsts: z
        .array(
            z.object({
                id: z.number().optional(),
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
                id: z.number().optional(),
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
                id: z.number().optional(),
                name: z.string().min(1, 'Person name is required'),
                email: z.string().email('Invalid email').optional().or(z.literal('')),
                address: z.string().optional(),
                status: z.boolean().default(true),
            }),
        )
        .optional()
        .default([]),
});

type VendorFormValues = z.infer<typeof VendorFormSchema>;

const EditVendorPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const orgId = id ? parseInt(id) : null;

    const { data: organization, isLoading, error } = useVendorOrganizationWithRelations(orgId);
    const updateVendor = useUpdateVendorOrganizationWithRelations();
    const createGst = useCreateVendorGst();
    const updateGst = useUpdateVendorGst();
    const deleteGst = useDeleteVendorGst();
    const createAccount = useCreateVendorAccount();
    const updateAccount = useUpdateVendorAccount();
    const deleteAccount = useDeleteVendorAccount();
    const createPerson = useCreateVendor();
    const updatePerson = useUpdateVendor();
    const createFile = useCreateVendorFile();
    const updateFile = useUpdateVendorFile();
    const deleteFile = useDeleteVendorFile();

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
        },
    });

    useEffect(() => {
        if (organization) {
            form.reset({
                organization: {
                    name: organization.name || '',
                    address: organization.address || '',
                    status: organization.status ?? true,
                },
                gsts: (organization as any).gsts || [],
                accounts: (organization as any).accounts || [],
                persons: (organization as any).persons || [],
            });
        }
    }, [organization, form]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !organization) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Error loading vendor organization: {error?.message || 'Not found'}
                </AlertDescription>
            </Alert>
        );
    }

    const orgWithRelations = organization as any;

    const handleSubmit = async (values: VendorFormValues) => {
        if (!orgId) return;

        try {
            await updateVendor.mutateAsync({
                id: orgId,
                data: {
                    organization: values.organization,
                },
            });
            navigate(paths.master.vendors);
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Vendor Organization</h1>
                    <p className="text-muted-foreground mt-2">
                        Update vendor organization details and manage related entities
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

                    {/* Related Entities Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Related Entities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="gsts" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="gsts">GST Numbers</TabsTrigger>
                                    <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
                                    <TabsTrigger value="persons">Persons</TabsTrigger>
                                    <TabsTrigger value="files">Files</TabsTrigger>
                                </TabsList>

                                <TabsContent value="gsts" className="mt-4">
                                    <GstList orgId={orgId!} gsts={orgWithRelations.gsts || []} />
                                </TabsContent>

                                <TabsContent value="accounts" className="mt-4">
                                    <AccountList
                                        orgId={orgId!}
                                        accounts={orgWithRelations.accounts || []}
                                    />
                                </TabsContent>

                                <TabsContent value="persons" className="mt-4">
                                    <PersonList
                                        orgId={orgId!}
                                        persons={orgWithRelations.persons || []}
                                    />
                                </TabsContent>

                                <TabsContent value="files" className="mt-4">
                                    <FileList
                                        files={orgWithRelations.files || []}
                                        persons={orgWithRelations.persons || []}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(paths.master.vendors)}
                            disabled={updateVendor.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateVendor.isPending}>
                            {updateVendor.isPending ? 'Updating...' : 'Update Organization'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

// List components for edit page
const GstList = ({ orgId, gsts }: { orgId: number; gsts: any[] }) => {
    const createGst = useCreateVendorGst();
    const deleteGst = useDeleteVendorGst();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        // Open quick add drawer - will be implemented
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add GST
                </Button>
            </div>
            {gsts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No GST numbers added yet
                </div>
            ) : (
                <div className="space-y-2">
                    {gsts.map((gst) => (
                        <Card key={gst.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{gst.gstNum}</div>
                                    <div className="text-sm text-muted-foreground">
                                        State: {gst.gstState}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => gst.id && deleteGst.mutate(gst.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

const AccountList = ({ orgId, accounts }: { orgId: number; accounts: any[] }) => {
    const createAccount = useCreateVendorAccount();
    const deleteAccount = useDeleteVendorAccount();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                </Button>
            </div>
            {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No bank accounts added yet
                </div>
            ) : (
                <div className="space-y-2">
                    {accounts.map((account) => (
                        <Card key={account.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{account.accountName}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {account.accountNum} | {account.accountIfsc}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            account.id && deleteAccount.mutate(account.id)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

const PersonList = ({ orgId, persons }: { orgId: number; persons: any[] }) => {
    const createPerson = useCreateVendor();
    const deletePerson = useDeleteVendorGst(); // Note: Need delete vendor hook

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Person
                </Button>
            </div>
            {persons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No persons added yet
                </div>
            ) : (
                <div className="space-y-2">
                    {persons.map((person) => (
                        <Card key={person.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{person.name}</div>
                                    {person.email && (
                                        <div className="text-sm text-muted-foreground">
                                            {person.email}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

const FileList = ({ files, persons }: { files: any[]; persons: any[] }) => {
    const deleteFile = useDeleteVendorFile();
    const getPersonName = (vendorId: number) => {
        const person = persons.find((p) => p.id === vendorId);
        return person?.name || 'Unknown';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add File
                </Button>
            </div>
            {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No files added yet</div>
            ) : (
                <div className="space-y-2">
                    {files.map((file) => (
                        <Card key={file.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{file.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Person: {getPersonName(file.vendorId)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => file.id && deleteFile.mutate(file.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EditVendorPage;
