import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useCreateVendorOrganization } from '@/hooks/api/useVendorOrganizations';
import { OrgFormSchema, type OrgFormValues } from './helpers/vendorForm.schema';
import { vendorAreaBase } from './vendorAreaPath';
import { AlertCircle } from 'lucide-react';

const CreateVendorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const createOrg = useCreateVendorOrganization();

    const form = useForm<OrgFormValues>({
        resolver: zodResolver(OrgFormSchema),
        defaultValues: {
            name: '',
            alias: '',
            msme: '',
            pan: '',
            address: '',
            status: true,
        },
    });

    const handleSubmit = async (values: OrgFormValues) => {
        try {
            const org = await createOrg.mutateAsync(values);
            navigate(`${basePath}/${org.id}/edit`);
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
                        Create the organisation first, then add GSTs, accounts, persons, and files on the edit page.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(basePath)}>
                    Cancel
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="alias"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alias</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Factory, HO" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="msme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>MSME</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UDYAM-XX-00-0000000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="pan"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>PAN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ABCDE1234F" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Enter organization address" rows={3} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col items-end gap-4 pt-4 border-t">
                        {Object.keys(form.formState.errors).length > 0 && (
                            <div className="text-sm text-destructive flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Please fix the validation errors.
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(basePath)} disabled={createOrg.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createOrg.isPending}>
                                {createOrg.isPending ? 'Creating...' : 'Create Organization'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default CreateVendorPage;
