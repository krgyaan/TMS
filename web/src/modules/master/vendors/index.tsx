import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Plus, Eye, MapPin, FileText, CreditCard, Users, Building2, Mail } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useVendorOrganizationsWithRelations } from "@/hooks/api/useVendorOrganizations";
import type { VendorOrganizationWithRelations, Vendor, VendorGst, VendorAcc, VendorFile } from "@/types/api.types";
import { paths } from "@/app/routes/paths";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const VendorsPage = () => {
    const navigate = useNavigate();
    const { data: organizations, isLoading, error, refetch } = useVendorOrganizationsWithRelations();

    // Modal states
    const [gstModal, setGstModal] = useState<{ open: boolean; data: VendorGst[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [accountsModal, setAccountsModal] = useState<{ open: boolean; data: VendorAcc[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [vendorsModal, setVendorsModal] = useState<{ open: boolean; data: Vendor[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [filesModal, setFilesModal] = useState<{ open: boolean; data: VendorFile[]; orgName: string; persons: Vendor[] }>({ open: false, data: [], orgName: "", persons: [] });

    // Organization action menu items
    const organizationActions: ActionItem<VendorOrganizationWithRelations>[] = [
        {
            label: "Edit",
            onClick: row => {
                navigate(paths.master.vendors_edit(row.id));
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (confirm(`Are you sure you want to delete "${row.name}"? This will also remove all associated vendors, GSTs, accounts, and files.`)) {
                    try {
                        // await deleteOrganization.mutateAsync(row.id);
                    } catch (error) {
                        console.error("Delete failed:", error);
                    }
                }
            },
        },
    ];

    // Main table column definitions
    const [colDefs] = useState<ColDef<VendorOrganizationWithRelations>[]>([
        {
            field: "name",
            headerName: "Organisation Name",
            filter: "agTextColumnFilter",
            cellRenderer: (params: any) => {
                const org = params.data;
                return (
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{org.name}</span>
                    </div>
                );
            },
        },
        {
            headerName: "GST Numbers",
            field: "gsts",
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.gsts || org.gsts?.length || 0;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Button variant="outline" size="sm" onClick={() => setGstModal({ open: true, data: org.gsts || [], orgName: org.name })} className="w-full max-w-[150px]">
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
            headerName: "Accounts",
            field: "accounts",
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.accounts || org.accounts?.length || 0;
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
            headerName: "All Vendors",
            field: "persons",
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org._counts?.persons || org.persons?.length || 0;
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
            headerName: "Files",
            field: "files",
            flex: 1,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                const org = params.data as VendorOrganizationWithRelations;
                const count = org.files?.length || 0;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setFilesModal({
                                    open: true,
                                    data: org.files || [],
                                    orgName: org.name,
                                    persons: org.persons || [],
                                })
                            }
                            className="w-full max-w-[150px]"
                            disabled={count === 0}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            <div className="flex flex-col items-start">
                                <span>See Files ({count})</span>
                            </div>
                        </Button>
                    </div>
                );
            },
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(organizationActions),
            pinned: "right",
            width: 100,
        },
    ]);

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
                    <CardDescription>Manage vendor organizations and their details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading vendor organizations: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
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
                    <CardDescription>Manage vendor organizations, GST numbers, bank accounts, vendors, and files</CardDescription>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.vendors_create}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Organization
                            </NavLink>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-3">
                    <DataTable
                        data={organizations || []}
                        columnDefs={colDefs}
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
                        onSelectionChanged={rows => console.log("Selected rows:", rows)}
                        height="100%"
                    />
                </CardContent>
            </Card>

            {/* GST Numbers Modal */}
            <Dialog open={gstModal.open} onOpenChange={open => setGstModal({ ...gstModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            GST Numbers - {gstModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total GST Numbers: {gstModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {gstModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {gstModal.data.map((gst, index) => (
                                    <div key={gst.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                <div>
                                                    <div className="font-medium">{gst.gstState}</div>
                                                    <div className="text-sm text-muted-foreground font-mono mt-1">{gst.gstNum}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant={gst.status ? "default" : "secondary"}>{gst.status ? "Active" : "Inactive"}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No GST numbers found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bank Accounts Modal */}
            <Dialog open={accountsModal.open} onOpenChange={open => setAccountsModal({ ...accountsModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Accounts - {accountsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Bank Accounts: {accountsModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {accountsModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {accountsModal.data.map((account, index) => (
                                    <div key={account.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                    <div className="font-medium">{account.accountName}</div>
                                                </div>
                                                <div className="ml-11 space-y-1">
                                                    <div className="text-sm text-muted-foreground">
                                                        <span className="font-medium">Account:</span> <span className="font-mono">{account.accountNum}</span>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        <span className="font-medium">IFSC:</span> <span className="font-mono">{account.accountIfsc}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={account.status ? "default" : "secondary"}>{account.status ? "Active" : "Inactive"}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                                <p>No bank accounts found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Vendors Modal */}
            <Dialog open={vendorsModal.open} onOpenChange={open => setVendorsModal({ ...vendorsModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Vendors - {vendorsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Vendors: {vendorsModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {vendorsModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {vendorsModal.data.map((vendor, index) => (
                                    <div key={vendor.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                    <div className="font-medium">{vendor.name}</div>
                                                </div>
                                                <div className="ml-11 space-y-1">
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Mail className="h-3 w-3" />
                                                            {vendor.email}
                                                        </div>
                                                    )}
                                                    {vendor.address && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            {vendor.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={vendor.status ? "default" : "secondary"}>{vendor.status ? "Active" : "Inactive"}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Users className="h-12 w-12 mb-4 opacity-50" />
                                <p>No vendors found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Files Modal */}
            <Dialog open={filesModal.open} onOpenChange={open => setFilesModal({ ...filesModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Files - {filesModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Files: {filesModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {filesModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {filesModal.data.map((file, index) => {
                                    const person = filesModal.persons.find(p => p.id === file.vendorId);
                                    return (
                                        <div key={file.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                        <div className="font-medium">{file.name}</div>
                                                    </div>
                                                    <div className="ml-11 space-y-1">
                                                        <div className="text-sm text-muted-foreground">
                                                            <span className="font-medium">Person:</span> {person?.name || "Unknown"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground font-mono">{file.filePath}</div>
                                                    </div>
                                                </div>
                                                <Badge variant={file.status ? "default" : "secondary"}>{file.status ? "Active" : "Inactive"}</Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No files found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default VendorsPage;
