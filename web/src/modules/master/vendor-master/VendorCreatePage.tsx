import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useCreateVendorOrganization } from '@/hooks/api/useVendorOrganizations';
import { OrgFormSchema, type OrgFormValues } from './helpers/vendorForm.schema';
import { vendorAreaBase } from './vendorAreaPath';
import { VendorOrgFields } from './components/VendorOrgFields';

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
                            <VendorOrgFields control={form.control} />
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => navigate(basePath)} disabled={createOrg.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createOrg.isPending}>
                            {createOrg.isPending ? 'Creating...' : 'Create Organization'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default CreateVendorPage;
