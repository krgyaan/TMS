import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertCircle,
    Plus,
    Eye,
    MapPin,
    FileText,
    CreditCard,
    Users,
    Building2,
    Mail,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import {
    useVendorOrganizationsWithRelations,
    useDeleteVendorOrganization,
} from '@/hooks/api/useVendorOrganizations';
import type {
    VendorOrganizationWithRelations,
    Vendor,
    VendorGst,
    VendorAcc,
} from '@/types/api.types';
import { paths } from '@/app/routes/paths';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const Vendors = () => {
    const {
        data: organizations,
        isLoading,
        error,
        refetch,
    } = useVendorOrganizationsWithRelations();
    const deleteOrganization = useDeleteVendorOrganization();

    // Modal states
    const [gstModal, setGstModal] = useState<{
        open: boolean;
        data: VendorGst[];
        orgName: string;
    }>({ open: false, data: [], orgName: '' });

    const [accountsModal, setAccountsModal] = useState<{
        open: boolean;
        data: VendorAcc[];
        orgName: string;
    }>({ open: false, data: [], orgName: '' });

    const [vendorsModal, setVendorsModal] = useState<{
        open: boolean;
        data: Vendor[];
        orgName: string;
    }>({ open: false, data: [], orgName: '' });

    // Organization action menu items
    const organizationActions: ActionItem<VendorOrganizationWithRelations>[] = [
        {
            label: 'Edit',
            onClick: (row) => {
                console.log('Edit', row);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (
                    confirm(
                        `Are you sure you want to delete "${row.name}"? This will also remove all associated vendors, GSTs, and accounts.`,
                    )
                ) {
                    try {
                        await deleteOrganization.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    // Main table column definitions
    const [colDefs] = useState<ColDef<VendorOrganizationWithRelations>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Organisation Name',
            flex: 2,
            filter: 'agTextColumnFilter',
            cellRenderer: (params: any) => {
                const org = params.data;
                return (
                    <div className="py-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{org.name}</span>
                        </div>
                        {org.address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                <MapPin className="h-3 w-3" />
                                {org.address}
                            </div>
                        )}
                    </div>
                );
            },
            autoHeight: true,
        },
        {
            headerName: 'GST Numbers',
            field: 'gsts',
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.gsts || 0;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setGstModal({ open: true, data: org.gsts || [], orgName: org.name })
                            }
                            className="w-full max-w-[150px]"
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            <div className="flex flex-col items-start">
                                <span>See GSTs ({count})</span>
                            </div>
                        </Button>
                    </div>
                );
            },
        },
        {
            headerName: 'Accounts',
            field: 'accounts',
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.accounts || 0;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setAccountsModal({
                                    open: true,
                                    data: org.accounts || [],
                                    orgName: org.name,
                                })
                            }
                            className="w-full max-w-[150px]"
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            <div className="flex flex-col items-start">
                                <span>See Accounts ({count})</span>
                            </div>
                        </Button>
                    </div>
                );
            },
        },
        {
            headerName: 'All Vendors',
            field: 'persons',
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.persons || 0;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setVendorsModal({
                                    open: true,
                                    data: org.persons || [],
                                    orgName: org.name,
                                })
                            }
                            className="w-full max-w-[150px]"
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            <div className="flex flex-col items-start">
                                <span>See Vendors ({count})</span>
                            </div>
                        </Button>
                    </div>
                );
            },
        },
        {
            headerName: 'Actions',
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(organizationActions),
            pinned: 'right',
            width: 100,
        },
    ]);

    // GST Modal Column Definitions
    const gstColDefs = useMemo<ColDef<VendorGst>[]>(
        () => [
            {
                headerName: 'S.No.',
                valueGetter: 'node.rowIndex + 1',
                width: 80,
                filter: false,
            },
            {
                field: 'gstState',
                headerName: 'State',
                flex: 1,
                filter: 'agTextColumnFilter',
            },
            {
                field: 'gstNum',
                headerName: 'GST Number',
                flex: 1.5,
                filter: 'agTextColumnFilter',
                cellClass: 'font-mono',
            }
        ],
        []
    );

    // Accounts Modal Column Definitions
    const accountsColDefs = useMemo<ColDef<VendorAcc>[]>(
        () => [
            {
                headerName: 'S.No.',
                valueGetter: 'node.rowIndex + 1',
                width: 80,
                filter: false,
            },
            {
                field: 'accountName',
                headerName: 'Account Name',
                flex: 1.5,
                filter: 'agTextColumnFilter',
            },
            {
                field: 'accountNum',
                headerName: 'Account Number',
                flex: 1,
                filter: 'agTextColumnFilter',
                cellClass: 'font-mono',
            },
            {
                field: 'accountIfsc',
                headerName: 'IFSC Code',
                flex: 1,
                filter: 'agTextColumnFilter',
                cellClass: 'font-mono',
            }
        ],
        []
    );

    // Vendors Modal Column Definitions
    const vendorsColDefs = useMemo<ColDef<Vendor>[]>(
        () => [
            {
                headerName: 'S.No.',
                valueGetter: 'node.rowIndex + 1',
                width: 80,
                filter: false,
            },
            {
                field: 'name',
                headerName: 'Vendor Name',
                flex: 1.5,
                filter: 'agTextColumnFilter',
                cellRenderer: (params: any) => {
                    const vendor = params.data;
                    return (
                        <div className="py-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{vendor.name}</span>
                                <Badge variant={vendor.status ? 'default' : 'secondary'}>
                                    {vendor.status ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            {vendor.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {vendor.email}
                                </div>
                            )}
                            {vendor.address && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {vendor.address}
                                </div>
                            )}
                        </div>
                    );
                },
                autoHeight: true,
            },
        ],
        []
    );

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Organizations</CardTitle>
                    <CardDescription>
                        Manage vendor organizations and their details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading vendor organizations: {error.message}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="ml-4"
                            >
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Organizations</CardTitle>
                    <CardDescription>
                        Manage vendor organizations, GST numbers, bank accounts, and vendors
                    </CardDescription>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.vendors_create}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Organization
                            </NavLink>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={organizations || []}
                        columnDefs={colDefs}
                        loading={isLoading || deleteOrganization.isPending}
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true,
                            },
                            rowSelection,
                            pagination: true,
                            paginationPageSize: 20,
                            paginationPageSizeSelector: [10, 20, 50, 100],
                        }}
                        enablePagination={true}
                        enableRowSelection={true}
                        selectionType="multiple"
                        onSelectionChanged={(rows) => console.log('Selected rows:', rows)}
                        height="100%"
                    />
                </CardContent>
            </Card>

            {/* GST Numbers Modal */}
            <Dialog
                open={gstModal.open}
                onOpenChange={(open) => setGstModal({ ...gstModal, open })}
            >
                <DialogContent className="max-w-6xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            GST Numbers - {gstModal.orgName}
                        </DialogTitle>
                        <DialogDescription>
                            Total GST Numbers: {gstModal.data.length}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4" style={{ height: '500px' }}>
                        {gstModal.data.length > 0 ? (
                            <DataTable
                                data={gstModal.data}
                                columnDefs={gstColDefs}
                                gridOptions={{
                                    defaultColDef: {
                                        editable: false,
                                        filter: true,
                                        sortable: true,
                                        resizable: true,
                                    },
                                    pagination: true,
                                    paginationPageSize: 10,
                                }}
                                enablePagination={true}
                                height="100%"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No GST numbers found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bank Accounts Modal */}
            <Dialog
                open={accountsModal.open}
                onOpenChange={(open) => setAccountsModal({ ...accountsModal, open })}
            >
                <DialogContent className="max-w-6xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Accounts - {accountsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>
                            Total Bank Accounts: {accountsModal.data.length}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4" style={{ height: '500px' }}>
                        {accountsModal.data.length > 0 ? (
                            <DataTable
                                data={accountsModal.data}
                                columnDefs={accountsColDefs}
                                gridOptions={{
                                    defaultColDef: {
                                        editable: false,
                                        filter: true,
                                        sortable: true,
                                        resizable: true,
                                    },
                                    pagination: true,
                                    paginationPageSize: 10,
                                }}
                                enablePagination={true}
                                height="100%"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                                <p>No bank accounts found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Vendors Modal */}
            <Dialog
                open={vendorsModal.open}
                onOpenChange={(open) => setVendorsModal({ ...vendorsModal, open })}
            >
                <DialogContent className="max-w-6xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Vendors - {vendorsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>
                            Total Vendors: {vendorsModal.data.length}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4" style={{ height: '500px' }}>
                        {vendorsModal.data.length > 0 ? (
                            <DataTable
                                data={vendorsModal.data}
                                columnDefs={vendorsColDefs}
                                gridOptions={{
                                    defaultColDef: {
                                        editable: false,
                                        filter: true,
                                        sortable: true,
                                        resizable: true,
                                    },
                                    pagination: true,
                                    paginationPageSize: 10,
                                }}
                                enablePagination={true}
                                height="100%"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Users className="h-12 w-12 mb-4 opacity-50" />
                                <p>No vendors found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Vendors;
