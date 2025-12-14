import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Building2,
    MapPin,
    Users,
    FileText,
    CreditCard,
    AlertCircle,
    Plus,
    MoreVertical,
    Mail,
} from 'lucide-react';
import { useVendorOrganizationsWithRelations } from '@/hooks/api/useVendorOrganizations';
import type { VendorOrganizationWithRelations, VendorOrganization } from '@/types/api.types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VendorOrganizationDrawer } from './components/VendorOrganizationDrawer';
import { VendorOrganizationViewModal } from './components/VendorOrganizationViewModal';
import { useState } from 'react';

const VendorOrganizationsPage = () => {
    const { data: organizations, isLoading, error, refetch } = useVendorOrganizationsWithRelations();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedOrganization, setSelectedOrganization] = useState<VendorOrganization | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Error loading vendor organizations: {error.message}
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Organizations</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage vendor organizations, persons, GST numbers, and bank accounts
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedOrganization(null);
                        setDrawerOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Organization
                </Button>
            </div>

            {/* Organizations List */}
            <Accordion type="single" collapsible className="space-y-4">
                {organizations?.map((org) => (
                    <OrganizationCard key={org.id} organization={org} />
                ))}
            </Accordion>

            {organizations?.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">
                            No vendor organizations found
                        </p>
                        <Button className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first organization
                        </Button>
                    </CardContent>
                </Card>
            )}
            <VendorOrganizationDrawer
                open={drawerOpen}
                onOpenChange={(open) => {
                    setDrawerOpen(open);
                    if (!open) {
                        setSelectedOrganization(null);
                    }
                }}
                vendorOrganization={selectedOrganization}
                onSuccess={() => {
                    refetch();
                }}
            />
            <VendorOrganizationViewModal
                open={viewModalOpen}
                onOpenChange={(open) => {
                    setViewModalOpen(open);
                    if (!open) {
                        setSelectedOrganization(null);
                    }
                }}
                vendorOrganization={selectedOrganization}
            />
        </div>
    );
};

// Separate component for each organization card
const OrganizationCard = ({
    organization,
}: {
    organization: VendorOrganizationWithRelations;
}) => {
    return (
        <AccordionItem value={`org-${organization.id}`} className="border rounded-lg bg-white">
            <Card className="border-0 shadow-none">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <AccordionTrigger className="hover:no-underline py-0">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-xl">{organization.name}</CardTitle>
                                    </div>
                                </AccordionTrigger>
                                <Badge variant={organization.status ? 'default' : 'secondary'}>
                                    {organization.status ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>

                            {organization.address && (
                                <CardDescription className="flex items-center gap-2 mt-2 ml-8">
                                    <MapPin className="h-4 w-4" />
                                    {organization.address}
                                </CardDescription>
                            )}

                            {/* Summary Badges */}
                            <div className="flex items-center gap-3 mt-3 ml-8">
                                <Badge variant="outline" className="gap-1">
                                    <Users className="h-3 w-3" />
                                    {organization._counts?.persons || 0} Persons
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <FileText className="h-3 w-3" />
                                    {organization._counts?.gsts || 0} GST
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {organization._counts?.accounts || 0} Accounts
                                </Badge>
                            </div>
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedOrganization(organization);
                                        setViewModalOpen(true);
                                    }}
                                >
                                    View Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedOrganization(organization);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    Edit Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem>Add Person</DropdownMenuItem>
                                <DropdownMenuItem>Add GST</DropdownMenuItem>
                                <DropdownMenuItem>Add Bank Account</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>

                {/* Expandable Content */}
                <AccordionContent>
                    <CardContent className="pt-4">
                        <Tabs defaultValue="persons" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="persons" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    Persons ({organization.persons.length})
                                </TabsTrigger>
                                <TabsTrigger value="gst" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    GST ({organization.gsts.length})
                                </TabsTrigger>
                                <TabsTrigger value="accounts" className="gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Accounts ({organization.accounts.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* Persons Tab */}
                            <TabsContent value="persons" className="mt-4">
                                <PersonsTable persons={organization.persons} />
                            </TabsContent>

                            {/* GST Tab */}
                            <TabsContent value="gst" className="mt-4">
                                <GSTTable gsts={organization.gsts} />
                            </TabsContent>

                            {/* Accounts Tab */}
                            <TabsContent value="accounts" className="mt-4">
                                <AccountsTable accounts={organization.accounts} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
    );
};

// Persons Table Component
const PersonsTable = ({ persons }: { persons: any[] }) => {
    if (persons.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No persons added yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                    Add Person
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {persons.map((person) => (
                <div
                    key={person.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                    <div className="flex-1">
                        <div className="font-medium">{person.name}</div>
                        {person.email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                {person.email}
                            </div>
                        )}
                        {person.address && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {person.address}
                            </div>
                        )}
                    </div>
                    <Badge variant={person.status ? 'default' : 'secondary'}>
                        {person.status ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            ))}
        </div>
    );
};

// GST Table Component
const GSTTable = ({ gsts }: { gsts: any[] }) => {
    if (gsts.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No GST numbers added yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                    Add GST
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-lg border">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">State</th>
                        <th className="text-left p-3 font-medium">GST Number</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {gsts.map((gst) => (
                        <tr key={gst.id} className="border-b last:border-0 hover:bg-accent/50">
                            <td className="p-3">{gst.gstState}</td>
                            <td className="p-3 font-mono text-sm">{gst.gstNum}</td>
                            <td className="p-3">
                                <Badge variant={gst.status ? 'default' : 'secondary'} className="text-xs">
                                    {gst.status ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="p-3 text-right">
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Accounts Table Component
const AccountsTable = ({ accounts }: { accounts: any[] }) => {
    if (accounts.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bank accounts added yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                    Add Bank Account
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-lg border">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Account Name</th>
                        <th className="text-left p-3 font-medium">Account Number</th>
                        <th className="text-left p-3 font-medium">IFSC Code</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.map((account) => (
                        <tr key={account.id} className="border-b last:border-0 hover:bg-accent/50">
                            <td className="p-3">{account.accountName}</td>
                            <td className="p-3 font-mono text-sm">{account.accountNum}</td>
                            <td className="p-3 font-mono text-sm">{account.accountIfsc}</td>
                            <td className="p-3">
                                <Badge variant={account.status ? 'default' : 'secondary'} className="text-xs">
                                    {account.status ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="p-3 text-right">
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VendorOrganizationsPage;
