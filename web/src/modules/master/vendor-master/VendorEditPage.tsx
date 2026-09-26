import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateVendorOrganizationWithRelations, useVendorOrganizationWithRelations } from "@/hooks/api/useVendorOrganizations";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AccountSection } from "./components/AccountSection";
import { FileSection } from "./components/FileSection";
import { GstSection } from "./components/GstSection";
import { PersonSection } from "./components/PersonSection";
import { vendorOrgToFormValues } from "./helpers/vendorForm.mappers";
import { VendorFormSchema, type VendorFormValues } from "./helpers/vendorForm.schema";
import { vendorAreaBase } from "./vendorAreaPath";

const EditVendorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const { id } = useParams<{ id: string }>();
    const orgId = id ? parseInt(id) : null;

    const { data: organization, isLoading, error } = useVendorOrganizationWithRelations(orgId);
    const updateVendor = useUpdateVendorOrganizationWithRelations();

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema),
        defaultValues: {
            organization: {
                name: "",
                alias: "",
                msme: "",
                pan: "",
                address: "",
                status: true,
            },
            gsts: [],
            accounts: [],
            persons: [],
            files: [],
        },
    });

    useEffect(() => {
        if (organization) {
            form.reset(vendorOrgToFormValues(organization));
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
                <AlertDescription>Error loading vendor organization: {error?.message || "Not found"}</AlertDescription>
            </Alert>
        );
    }

    const handleSubmit = async (values: VendorFormValues) => {
        if (!orgId) return;

        try {
            await updateVendor.mutateAsync({
                id: orgId,
                data: {
                    organization: values.organization,
                },
            });
            navigate(basePath);
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Vendor Organization</h1>
                    <p className="text-muted-foreground mt-2">Update vendor organization details and manage related entities</p>
                </div>
                <Button variant="outline" onClick={() => navigate(basePath)}>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="organization.alias"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alias</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Factory, HO" {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="organization.msme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>MSME</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UDYAM-XX-00-0000000" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="organization.pan"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>PAN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ABCDE1234F" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="organization.address"
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
                                name="organization.status"
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
                                    <GstSection orgId={orgId!} />
                                </TabsContent>

                                <TabsContent value="accounts" className="mt-4">
                                    <AccountSection orgId={orgId!} />
                                </TabsContent>

                                <TabsContent value="persons" className="mt-4">
                                    <PersonSection orgId={orgId!} />
                                </TabsContent>

                                <TabsContent value="files" className="mt-4">
                                    <FileSection orgId={orgId!} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Submit Buttons */}
                    <div className="flex flex-col items-end gap-4 pt-4 border-t">
                        {Object.keys(form.formState.errors).length > 0 && (
                            <div className="text-sm text-destructive flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Please fix the validation errors (check organization details and ensure all added persons have a valid email and mobile number).
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(basePath)} disabled={updateVendor.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateVendor.isPending}>
                                {updateVendor.isPending ? "Updating..." : "Update Organization"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default EditVendorPage;
