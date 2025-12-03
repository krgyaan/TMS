// pages/courier/CourierDashboard.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { RefreshCw, FileEdit, Eye, Trash, Loader2, Plus } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

// API & Hooks
import { useCourierDashboard, useUpdateCourierStatus, useDeleteCourier, useUploadDeliveryPod } from "@/hooks/api/useCouriers";
import { COURIER_STATUS, COURIER_STATUS_LABELS, type Courier } from "@/types/courier.types";

// Helper: Calculate timer (days remaining)
const calculateTimer = (delDate: string | null, status: number): string => {
    if (status === COURIER_STATUS.DELIVERED) return "Delivered";
    if (status === COURIER_STATUS.REJECTED) return "Rejected";
    if (!delDate) return "-";

    const now = new Date();
    const delivery = new Date(delDate);
    const diffTime = delivery.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return "Due today";
    return `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
};

// Helper: Format date
const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Generate request number
const getRequestNo = (id: number, createdAt: string): string => {
    const date = new Date(createdAt);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `CR-${year}${month}-${id.toString().padStart(4, "0")}`;
};

const CourierDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>("pending");

    // API hooks
    const { data: dashboardData, isLoading, isError } = useCourierDashboard();
    const updateStatusMutation = useUpdateCourierStatus();
    const deleteMutation = useDeleteCourier();
    const uploadPodMutation = useUploadDeliveryPod();

    // Modal state
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
    const [newStatus, setNewStatus] = useState<string>("");

    // Delivery fields (for Delivered status)
    const [deliveryDate, setDeliveryDate] = useState<string>("");
    const [deliveryPod, setDeliveryPod] = useState<File | null>(null);
    const [withinTime, setWithinTime] = useState<string>("1");

    // Open status modal
    const openStatusModal = useCallback((courier: Courier) => {
        setSelectedCourier(courier);
        setNewStatus(courier.status.toString());
        setDeliveryDate("");
        setDeliveryPod(null);
        setWithinTime("1");
        setStatusModalOpen(true);
    }, []);

    // Handle status submit
    const handleSubmitStatus = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedCourier) return;

        const statusNum = parseInt(newStatus);

        try {
            // Update status
            await updateStatusMutation.mutateAsync({
                id: selectedCourier.id,
                data: {
                    status: statusNum,
                    delivery_date: statusNum === COURIER_STATUS.DELIVERED ? deliveryDate : undefined,
                    within_time: statusNum === COURIER_STATUS.DELIVERED ? withinTime === "1" : undefined,
                },
            });

            // Upload POD if delivered and file selected
            if (statusNum === COURIER_STATUS.DELIVERED && deliveryPod) {
                await uploadPodMutation.mutateAsync({
                    id: selectedCourier.id,
                    file: deliveryPod,
                });
            }

            setStatusModalOpen(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    // Handle delete
    const handleDelete = useCallback(
        (courier: Courier) => {
            if (window.confirm(`Are you sure you want to delete courier ${getRequestNo(courier.id, courier.created_at)}?`)) {
                deleteMutation.mutate(courier.id);
            }
        },
        [deleteMutation]
    );

    // Handle POD file change
    const handlePodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setDeliveryPod(file);
    };

    // Action items
    const courierActions = useMemo(
        () => [
            {
                label: "Status",
                icon: <FileEdit className="h-4 w-4" />,
                className: "text-blue-600",
                onClick: (row: Courier) => openStatusModal(row),
            },
            {
                label: "Dispatch",
                icon: <RefreshCw className="h-4 w-4" />,
                onClick: (row: Courier) => navigate(`${paths.shared.courierDispatch}/${row.id}`),
            },
            {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: Courier) => navigate(paths.shared.courierView(row.id)),
            },
            {
                label: "Delete",
                icon: <Trash className="h-4 w-4" />,
                className: "text-red-600",
                onClick: handleDelete,
            },
        ],
        [openStatusModal, handleDelete, navigate]
    );

    // Columns
    const columns: ColDef[] = useMemo(
        () => [
            {
                headerName: "Request No",
                width: 150,
                valueGetter: (p: any) => (p.data ? getRequestNo(p.data.id, p.data.created_at) : "-"),
            },
            {
                field: "created_at",
                headerName: "Request Date",
                width: 140,
                valueGetter: (p: any) => formatDate(p.data?.created_at),
            },
            { field: "to_name", headerName: "To (Name)", width: 160 },
            { field: "to_org", headerName: "Organization", width: 160 },
            {
                field: "del_date",
                headerName: "Expected Delivery",
                width: 140,
                valueGetter: (p: any) => formatDate(p.data?.del_date),
            },
            {
                headerName: "Timer",
                width: 130,
                sortable: false,
                filter: false,
                cellRenderer: (p: any) => {
                    const timer = calculateTimer(p.data?.del_date, p.data?.status);
                    const isOverdue = timer.includes("overdue");
                    const isDueToday = timer === "Due today";

                    return (
                        <Badge variant={isOverdue ? "destructive" : isDueToday ? "warning" : "secondary"} className="text-xs">
                            {timer}
                        </Badge>
                    );
                },
            },
            {
                field: "courier_provider",
                headerName: "Provider",
                width: 130,
                valueGetter: (p: any) => p.data?.courier_provider ?? "-",
            },
            {
                field: "pickup_date",
                headerName: "Pickup Date",
                width: 150,
                valueGetter: (p: any) => formatDateTime(p.data?.pickup_date),
            },
            {
                field: "docket_no",
                headerName: "Docket No",
                width: 130,
                valueGetter: (p: any) => p.data?.docket_no ?? "-",
            },
            {
                field: "delivery_date",
                headerName: "Delivery Date",
                width: 150,
                valueGetter: (p: any) => formatDateTime(p.data?.delivery_date),
            },
            {
                headerName: "Action",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(courierActions),
                width: 100,
            },
        ],
        [courierActions]
    );

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading couriers...</span>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600">Failed to load courier data</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const counts = dashboardData?.counts ?? {
        pending: 0,
        dispatched: 0,
        not_delivered: 0,
        delivered: 0,
        rejected: 0,
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Courier Dashboard</CardTitle>
                    <CardDescription>Manage courier requests and statuses</CardDescription>
                </div>
                <Button onClick={() => navigate(paths.shared.courierCreate)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Courier
                </Button>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="pending" onValueChange={setActiveTab}>
                    <TabsList className="mx-auto flex justify-center mb-4">
                        <TabsTrigger value="pending">
                            Pending
                            <Badge variant="secondary" className="ml-2">
                                {counts.pending}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="dispatched">
                            Dispatched
                            <Badge variant="secondary" className="ml-2">
                                {counts.dispatched}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="not_delivered">
                            Not Delivered
                            <Badge variant="secondary" className="ml-2">
                                {counts.not_delivered}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="delivered">
                            Delivered
                            <Badge variant="secondary" className="ml-2">
                                {counts.delivered}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="rejected">
                            Rejected
                            <Badge variant="secondary" className="ml-2">
                                {counts.rejected}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        <DataTable
                            data={dashboardData?.pending ?? []}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { filter: true, sortable: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="dispatched">
                        <DataTable
                            data={dashboardData?.dispatched ?? []}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { filter: true, sortable: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="not_delivered">
                        <DataTable
                            data={dashboardData?.not_delivered ?? []}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { filter: true, sortable: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="delivered">
                        <DataTable
                            data={dashboardData?.delivered ?? []}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { filter: true, sortable: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="rejected">
                        <DataTable
                            data={dashboardData?.rejected ?? []}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { filter: true, sortable: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* Status Modal */}
            <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Change Status
                            {selectedCourier && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">({getRequestNo(selectedCourier.id, selectedCourier.created_at)})</span>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmitStatus} className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(COURIER_STATUS).map(([key, value]) => (
                                        <SelectItem key={value} value={value.toString()}>
                                            {COURIER_STATUS_LABELS[value]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Delivery fields - shown only when status === DELIVERED */}
                        {newStatus === COURIER_STATUS.DELIVERED.toString() && (
                            <div className="grid gap-3 pt-2 border-t">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivery Date & Time</label>
                                    <Input type="datetime-local" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required />
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivery POD Upload</label>
                                    <Input type="file" accept="image/*,.pdf" onChange={handlePodChange} />
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivered within Expected Time?</label>
                                    <Select value={withinTime} onValueChange={setWithinTime}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Yes</SelectItem>
                                            <SelectItem value="0">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setStatusModalOpen(false)} disabled={updateStatusMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateStatusMutation.isPending || uploadPodMutation.isPending}>
                                {updateStatusMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default CourierDashboard;
