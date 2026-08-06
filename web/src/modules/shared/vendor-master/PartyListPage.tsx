import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActivateParty, useDeactivateParty, usePoParties, useUpdateParty } from "@/hooks/api/usePurchaseOrders";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { PartyFormDialog, type CreatePartyPayload } from "@/modules/shared/vendor-master/PartyFormDialog";
import type { CreatePartyDTO } from "@/modules/shared/vendor-master/vendor-master.types";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Edit, Eye, Search, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface VendorMasterRow {
    id: number;
    name: string;
    alias?: string;
    email?: string;
    address?: string;
    gstNo?: string;
    pan?: string;
    msme?: string;
    contactPerson?: string;
    mobileNumber?: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface PartyViewDialogProps {
    party: VendorMasterRow | null;
    open: boolean;
    onClose: () => void;
}

const PartyViewDialog: React.FC<PartyViewDialogProps> = ({ party, open, onClose }) => {
    if (!party) return null;

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Party Details: {party.name}</DialogTitle>
                    <DialogDescription>View party information</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-muted-foreground">Name</span>
                            <p className="font-medium">{party.name || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Alias</span>
                            <p className="font-medium">{party.alias || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Email</span>
                            <p className="font-medium">{party.email || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Mobile</span>
                            <p className="font-medium">{party.mobileNumber || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Contact Person</span>
                            <p className="font-medium">{party.contactPerson || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">GST</span>
                            <p className="font-medium">{party.gstNo || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">PAN</span>
                            <p className="font-medium">{party.pan || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">MSME</span>
                            <p className="font-medium">{party.msme || "-"}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-sm text-muted-foreground">Address</span>
                            <p className="font-medium">{party.address || "-"}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const VendorMasterListPage: React.FC = () => {
    const navigate = useNavigate();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [internalSearch, setInternalSearch] = useState("");
    const { search, setSearch } = { search: internalSearch, setSearch: setInternalSearch };
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [viewParty, setViewParty] = useState<VendorMasterRow | null>(null);
    const [editParty, setEditParty] = useState<VendorMasterRow | null>(null);

    const { data: partiesData, isLoading: isPartiesLoading, refetch: refetchParties } = usePoParties();
    const activateMutation = useActivateParty();
    const deactivateMutation = useDeactivateParty();
    const updateMutation = useUpdateParty();

    // const parties: VendorMasterRow[] = (partiesData as VendorMasterRow[] | undefined) ?? [];
    const parties: VendorMasterRow[] = (partiesData as VendorMasterRow[] | undefined)
    ?.filter((p) => p.type === "seller") ?? [];

    const onGridReady = useCallback((event: GridReadyEvent<VendorMasterRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const handleToggleActive = async (party: VendorMasterRow) => {
        try {
            if (party.isActive) {
                await deactivateMutation.mutateAsync(party.id);
                toast.success(`Party "${party.name}" has been deactivated.`);
            } else {
                await activateMutation.mutateAsync(party.id);
                toast.success(`Party "${party.name}" has been activated.`);
            }
            refetchParties();
        } catch (error: any) {
            toast.error(error?.message || "Failed to update party status.");
        }
    };

    const handleEditSubmit = async (partyData: CreatePartyPayload) => {
        if (!editParty) return;
        try {
            const dto: CreatePartyDTO = {
                name: partyData.name,
                alias: partyData.alias || undefined,
                email: partyData.email || undefined,
                address: partyData.address || undefined,
                gstNo: partyData.gstNo || undefined,
                pan: partyData.pan || undefined,
                msme: partyData.msme || undefined,
                type: editParty.type,
                contact_person: partyData.contact_person || undefined,
                mobile_number: partyData.mobile_number || undefined,
            };
            await updateMutation.mutateAsync({ id: editParty.id, data: dto });
            toast.success(`Party "${partyData.name}" has been updated successfully.`);
            setEditParty(null);
            refetchParties();
        } catch (error: any) {
            toast.error(error?.message || "Failed to update party. Please try again.");
        }
    };

    const partyActions: ActionItem<VendorMasterRow>[] = useMemo(() => {
        const actions: ActionItem<VendorMasterRow>[] = [
            {
                label: "View Details",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row) => setViewParty(row),
            },
            {
                label: "Edit",
                icon: <Edit className="h-4 w-4" />,
                onClick: (row) => setEditParty(row),
            },
            {
                label: "Deactivate",
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (row) => handleToggleActive(row),
                visible: (row) => row.isActive,
                className: "text-destructive",
            },
            {
                label: "Activate",
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (row) => handleToggleActive(row),
                visible: (row) => !row.isActive,
            },
        ];
        return actions;
    }, [handleToggleActive]);

    const partyColumns = useMemo<ColDef<VendorMasterRow>[]>(() => [
        {
            field: "name",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            width: 150
        },
        {
            field: "alias",
            headerName: "Alias",
            sortable: true,
            filter: true,
            width: 120,
        },
        {
            field: "email",
            headerName: "Email",
            sortable: true,
            filter: true,
            width: 200
        },
        {
            field: "contactPerson",
            headerName: "Contact Person",
            sortable: true,
            filter: true,
            width: 160
        },
        {
            field: "mobileNumber",
            headerName: "Mobile",
            sortable: true,
            filter: true,
            width: 150
        },
        {
            field: "gstNo",
            headerName: "GST",
            sortable: true,
            filter: true,
            width: 150
        },
        {
            field: "pan",
            headerName: "PAN",
            sortable: true,
            filter: true,
            width: 120
        },
        {
            field: "msme",
            headerName: "MSME",
            sortable: true,
            filter: true,
            width: 130
        },
        {
            field: "isActive",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 90,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => {
                const val = p.value;
                return (
                    <Badge variant={val ? "default" : "secondary"} className="gap-1 cursor-pointer">
                        {val ? "Active" : "Inactive"}
                    </Badge>
                );
            },
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<VendorMasterRow>(partyActions),
            width: 120,
            pinned: "right",
        },
    ], [navigate, partyActions]);

    if (isPartiesLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Vendor Master</CardTitle>
                    <CardDescription>Loading parties...</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Please wait while we load the vendor master list.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Vendor Master</CardTitle>
                <CardDescription>List of all vendor/seller and shipping parties for PO and WO.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex justify-end mb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by name, email, contact, mobile..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={parties}
                    columnDefs={partyColumns}
                    onGridReady={onGridReady}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 100,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>

            {viewParty && (
                <PartyViewDialog
                    party={viewParty}
                    open={!!viewParty}
                    onClose={() => setViewParty(null)}
                />
            )}

            {editParty && (
                <PartyFormDialog
                    title="Edit Party"
                    description="Update party information"
                    open={!!editParty}
                    onOpenChange={(open) => { if (!open) setEditParty(null); }}
                    onSubmit={handleEditSubmit}
                    isLoading={updateMutation.isPending}
                    initialValues={{
                        name: editParty.name,
                        alias: editParty.alias || "",
                        email: editParty.email || "",
                        address: editParty.address || "",
                        gstNo: editParty.gstNo || "",
                        pan: editParty.pan || "",
                        msme: editParty.msme || "",
                        contact_person: editParty.contactPerson || "",
                        mobile_number: editParty.mobileNumber || "",
                    }}
                />
            )}
        </Card>
    );
};

export default VendorMasterListPage;
