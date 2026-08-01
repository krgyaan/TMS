import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Eye, Edit, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/hooks/useFormatedDate";
import { toast } from "sonner";
import { usePoParties, useActivateParty, useDeactivateParty, useUpdateParty } from "@/hooks/api/usePurchaseOrders";
import { PartyFormDialog, type CreatePartyPayload } from "@/modules/shared/vendor-master/PartyFormDialog";
import type { CreatePartyDTO } from "@/modules/shared/vendor-master/vendor-master.types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
                            <p className="font-medium">{party.name || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Alias</span>
                            <p className="font-medium">{party.alias || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Email</span>
                            <p className="font-medium">{party.email || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Mobile</span>
                            <p className="font-medium">{party.mobileNumber || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Contact Person</span>
                            <p className="font-medium">{party.contactPerson || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Type</span>
                            <p className="font-medium">{party.type || "—"}</p>
                        </div>
                        {party.gstNo && (
                            <div>
                                <span className="text-sm text-muted-foreground">GST</span>
                                <p className="font-medium">{party.gstNo}</p>
                            </div>
                        )}
                        {party.pan && (
                            <div>
                                <span className="text-sm text-muted-foreground">PAN</span>
                                <p className="font-medium">{party.pan}</p>
                            </div>
                        )}
                        {party.msme && (
                            <div>
                                <span className="text-sm text-muted-foreground">MSME</span>
                                <p className="font-medium">{party.msme}</p>
                            </div>
                        )}
                        {party.address && (
                            <div className="col-span-2">
                                <span className="text-sm text-muted-foreground">Address</span>
                                <p className="font-medium">{party.address}</p>
                            </div>
                        )}
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

    const parties: VendorMasterRow[] = (partiesData as VendorMasterRow[] | undefined) ?? [];

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
            flex: 1,
            minWidth: 150,
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.name} ${d.alias || ""} ${d.email || ""} ${d.contactPerson || ""} ${d.mobileNumber || ""}`;
            },
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px] font-medium">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                                {p.data?.email && <p><strong>Email:</strong> {p.data.email}</p>}
                                {p.data?.contactPerson && <p><strong>Contact:</strong> {p.data.contactPerson}</p>}
                                {p.data?.mobileNumber && <p><strong>Mobile:</strong> {p.data.mobileNumber}</p>}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
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
            width: 200,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <span className="text-muted-foreground truncate block max-w-[180px]">{p.value || "—"}</span>
            ),
        },
        {
            field: "contactPerson",
            headerName: "Contact Person",
            sortable: true,
            filter: true,
            width: 160,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <span className="truncate block max-w-[140px]">{p.value || "—"}</span>
            ),
        },
        {
            field: "mobileNumber",
            headerName: "Mobile",
            sortable: true,
            filter: true,
            width: 150,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <span className="truncate block max-w-[140px]">{p.value || "—"}</span>
            ),
        },
        {
            field: "type",
            headerName: "Type",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => {
                const val = p.value as string;
                const isSeller = val === "seller";
                return (
                    <Badge variant={isSeller ? "default" : "secondary"} className="capitalize">
                        {val || "—"}
                    </Badge>
                );
            },
        },
        {
            field: "gstNo",
            headerName: "GST",
            sortable: true,
            filter: true,
            width: 140,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <span className="text-muted-foreground font-mono text-xs">{p.value || "—"}</span>
            ),
        },
        {
            field: "pan",
            headerName: "PAN",
            sortable: true,
            filter: true,
            width: 120,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => (
                <span className="text-muted-foreground font-mono text-xs">{p.value || "—"}</span>
            ),
        },
        {
            field: "isActive",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: CustomCellRendererProps<VendorMasterRow>) => {
                const val = p.value;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant={val ? "default" : "secondary"} className="gap-1 cursor-pointer">
                                    {val ? "Active" : "Inactive"}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{val ? "This party is active" : "This party is inactive"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "createdAt",
            headerName: "Created On",
            sortable: true,
            filter: true,
            width: 130,
            valueFormatter: (p: ValueFormatterParams<VendorMasterRow>) => {
                if (!p.value) return "—";
                return formatDate(p.value);
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
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center gap-2">
                    <CardTitle className="text-base font-semibold">Vendor Master</CardTitle>
                    <Badge variant="secondary">{parties.length} party{parties.length !== 1 ? "ies" : "y"}</Badge>
                </div>
                <CardDescription>List of all vendor/seller and shipping parties</CardDescription>
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
