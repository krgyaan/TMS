import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useActivateParty, useDeactivateParty, usePoParties, useUpdateParty } from "@/hooks/api/usePurchaseOrders";
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary } from "@/hooks/api/useProjectPaymentRequests";
import { formatDate } from "@/hooks/useFormatedDate";
import { BeneficiaryFormDialog } from "./components/BeneficiaryFormDialog";
import { BeneficiaryViewDialog } from "./components/BeneficiaryViewDialog";
import { PartyFormDialog, type CreatePartyPayload } from "./PartyFormDialog";
import type { Beneficiary, BeneficiaryFormValues, CreatePartyDTO } from "./vendor-master.types";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Edit, Eye, Landmark, Plus, Search, Trash2 } from "lucide-react";
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
    const { activeTab, setActiveTab, search, setSearch, debouncedSearch } = usePersistentTableState<"vendors" | "beneficiaries">({
        storageKey: "vendor-master-tab",
        defaultTab: "vendors",
    });

    const [partyGridApi, setPartyGridApi] = useState<GridApi | null>(null);
    const [beneficiaryGridApi, setBeneficiaryGridApi] = useState<GridApi | null>(null);
    const [viewParty, setViewParty] = useState<VendorMasterRow | null>(null);
    const [editParty, setEditParty] = useState<VendorMasterRow | null>(null);
    const [viewBeneficiary, setViewBeneficiary] = useState<Beneficiary | null>(null);
    const [editBeneficiary, setEditBeneficiary] = useState<Beneficiary | null>(null);
    const [isBeneficiaryFormOpen, setIsBeneficiaryFormOpen] = useState(false);

    const { data: partiesData, isLoading: isPartiesLoading, refetch: refetchParties } = usePoParties();
    const { data: beneficiariesData, isLoading: isBeneficiariesLoading } = useBeneficiaries();
    const activateMutation = useActivateParty();
    const deactivateMutation = useDeactivateParty();
    const updateMutation = useUpdateParty();
    const createBeneficiaryMutation = useCreateBeneficiary();
    const updateBeneficiaryMutation = useUpdateBeneficiary();

    const parties: VendorMasterRow[] = (partiesData as VendorMasterRow[] | undefined)
        ?.filter((p) => p.type === "seller") ?? [];

    const beneficiaries: Beneficiary[] = (beneficiariesData as Beneficiary[] | undefined) ?? [];

    const onPartyGridReady = useCallback((event: GridReadyEvent<VendorMasterRow>) => {
        setPartyGridApi(event.api);
    }, []);

    const onBeneficiaryGridReady = useCallback((event: GridReadyEvent<Beneficiary>) => {
        setBeneficiaryGridApi(event.api);
    }, []);

    useEffect(() => {
        partyGridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, partyGridApi]);

    useEffect(() => {
        beneficiaryGridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, beneficiaryGridApi]);

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

    const handleBeneficiarySubmit = async (values: BeneficiaryFormValues) => {
        try {
            if (editBeneficiary) {
                await updateBeneficiaryMutation.mutateAsync({ id: editBeneficiary.id, data: values });
                toast.success(`Beneficiary "${values.name}" has been updated successfully.`);
                setEditBeneficiary(null);
            } else {
                await createBeneficiaryMutation.mutateAsync(values);
                toast.success(`Beneficiary "${values.name}" has been added successfully.`);
            }
            setIsBeneficiaryFormOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to save beneficiary. Please try again.");
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

    const beneficiaryActions: ActionItem<Beneficiary>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => setViewBeneficiary(row),
        },
        {
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => {
                setEditBeneficiary(row);
                setIsBeneficiaryFormOpen(true);
            },
        },
    ], []);

    const beneficiaryColumns = useMemo<ColDef<Beneficiary>[]>(() => [
        {
            field: "name",
            headerName: "Beneficiary Name",
            sortable: true,
            filter: true,
            width: 200
        },
        {
            field: "accountNumber",
            headerName: "Account Number",
            sortable: true,
            filter: true,
            width: 180
        },
        {
            field: "ifsc",
            headerName: "IFSC",
            sortable: true,
            filter: true,
            width: 130
        },
        {
            field: "bankName",
            headerName: "Bank Name",
            sortable: true,
            filter: true,
            width: 200
        },
        {
            field: "createdAt",
            headerName: "Created At",
            sortable: true,
            filter: true,
            width: 140,
            valueFormatter: (p) => (p.value ? formatDate(p.value) : "-"),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<Beneficiary>(beneficiaryActions),
            width: 120,
            pinned: "right",
        },
    ], [beneficiaryActions]);

    const searchBox = (
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
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Vendor & Beneficiary Master</CardTitle>
                <CardDescription>Manage vendor/seller parties and project payment beneficiaries.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "vendors" | "beneficiaries")}>
                    <TabsList className="m-auto">
                        <TabsTrigger value="vendors">Vendors</TabsTrigger>
                        <TabsTrigger value="beneficiaries" className="flex items-center gap-1">
                            <Landmark className="h-4 w-4" />
                            Project Beneficiaries
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="vendors" className="m-0">
                        {activeTab === "vendors" && (
                            <>
                                <div className="flex justify-end mb-4">
                                    {searchBox}
                                </div>
                                {isPartiesLoading ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">Loading vendors...</div>
                                ) : (
                                    <DataTable
                                        data={parties}
                                        columnDefs={partyColumns}
                                        onGridReady={onPartyGridReady}
                                        gridOptions={{
                                            pagination: true,
                                            paginationPageSize: 100,
                                            domLayout: "autoHeight",
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="beneficiaries" className="m-0">
                        {activeTab === "beneficiaries" && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <Button
                                        type="button"
                                        variant="default"
                                        onClick={() => {
                                            setEditBeneficiary(null);
                                            setIsBeneficiaryFormOpen(true);
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Beneficiary
                                    </Button>
                                    {searchBox}
                                </div>
                                {isBeneficiariesLoading ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">Loading beneficiaries...</div>
                                ) : (
                                    <DataTable
                                        data={beneficiaries}
                                        columnDefs={beneficiaryColumns}
                                        onGridReady={onBeneficiaryGridReady}
                                        gridOptions={{
                                            pagination: true,
                                            paginationPageSize: 100,
                                            domLayout: "autoHeight",
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
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

            {viewBeneficiary && (
                <BeneficiaryViewDialog
                    beneficiary={viewBeneficiary}
                    open={!!viewBeneficiary}
                    onClose={() => setViewBeneficiary(null)}
                />
            )}

            <BeneficiaryFormDialog
                open={isBeneficiaryFormOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditBeneficiary(null);
                        setIsBeneficiaryFormOpen(false);
                    }
                }}
                onSubmit={handleBeneficiarySubmit}
                isLoading={createBeneficiaryMutation.isPending || updateBeneficiaryMutation.isPending}
                title={editBeneficiary ? "Edit Beneficiary" : "Add Beneficiary"}
                description={editBeneficiary
                    ? "Update beneficiary bank account information"
                    : "Add a beneficiary to use as the payment receiving bank account."}
                initialValues={editBeneficiary ? {
                    name: editBeneficiary.name || "",
                    userId: editBeneficiary.userId ?? null,
                    accountNumber: editBeneficiary.accountNumber || "",
                    ifsc: editBeneficiary.ifsc || "",
                    bankName: editBeneficiary.bankName || "",
                } : undefined}
            />
        </Card>
    );
};

export default VendorMasterListPage;