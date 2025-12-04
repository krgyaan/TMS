import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table"; // your AG Grid wrapper
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { RefreshCw, FileEdit, Eye, Trash } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

// -----------------------------
// Dummy Data — mirrors Blade columns
// -----------------------------
const dummyCouriers = {
    pending: [
        {
            id: 1001,
            request_no: "CR-1001",
            created_at: "2025-01-10 10:20",
            to_name: "Ravi Kumar",
            courier_from: { name: "Head Office" },
            del_date: "2025-01-20",
            timer: "2 days left",
            courier_provider: "BlueDart",
            pickup_date: "2025-01-11 09:00",
            docket_no: "BD-4551",
            delivery_date: null,
            status: "pending",
        },
        {
            id: 1002,
            request_no: "CR-1002",
            created_at: "2025-01-12 11:15",
            to_name: "Sunita Sharma",
            courier_from: { name: "Branch A" },
            del_date: "2025-01-22",
            timer: "4 days left",
            courier_provider: "DHL",
            pickup_date: "2025-01-13 14:30",
            docket_no: "DH-9912",
            delivery_date: null,
            status: "pending",
        },
    ],
    dispatched: [],
    not_delivered: [],
    delivered: [
        {
            id: 1011,
            request_no: "CR-1011",
            created_at: "2024-12-20 09:05",
            to_name: "Aman Gupta",
            courier_from: { name: "HO" },
            del_date: "2024-12-28",
            timer: "delivered",
            courier_provider: "FedEx",
            pickup_date: "2024-12-21 08:00",
            docket_no: "FX-3344",
            delivery_date: "2024-12-27 13:00",
            status: "delivered",
        },
    ],
    rejected: [],
};

// -----------------------------
// Type definitions
// -----------------------------
type CourierRow = {
    id: number;
    request_no: string;
    created_at: string;
    to_name: string;
    courier_from: { name: string } | null;
    del_date: string | null;
    timer: string;
    courier_provider: string | null;
    pickup_date: string | null;
    docket_no: string | null;
    delivery_date: string | null;
    status: string;
};

const CourierDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>("pending");

    // Modal state for status update
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>("");

    // Delivery-specific fields (appear when status === '4' i.e., Delivered)
    const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
    const [deliveryPod, setDeliveryPod] = useState<File | null>(null);
    const [withinTime, setWithinTime] = useState<string>("1");

    // Actions (same style as followups reference)
    const courierActions = [
        {
            label: "Status",
            icon: <FileEdit className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: (row: CourierRow) => {
                openStatusModal(row.id, row.status);
            },
        },
        {
            label: "Dispatch",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: (row: CourierRow) => {
                // Equivalent to: route('courier.despatch', $courier->id)
                navigate(paths.shared.courierDispatch);
            },
        },
        {
            label: "Delete",
            icon: <Trash className="h-4 w-4" />,
            className: "text-red-600",
            onClick: (row: CourierRow) => {
                if (window.confirm("Are you sure you want to delete this courier?")) {
                    console.log("Deleting courier:", row.id);
                    // TODO: call API to delete
                }
            },
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row: CourierRow) => {
                navigate(`/courier/show/${row.id}`);
            },
        },
    ];

    const columns: ColDef[] = useMemo(
        () => [
            { field: "request_no", headerName: "Request No", width: 140 },
            { field: "created_at", headerName: "Request Date", width: 160 },
            { field: "to_name", headerName: "To (Name)", width: 180 },
            {
                field: "courier_from.name",
                headerName: "From (Name)",
                width: 160,
                valueGetter: (p: any) => p.data?.courier_from?.name ?? "-",
            },
            { field: "del_date", headerName: "Expected Delivery Date", width: 150 },
            { field: "timer", headerName: "Timer", width: 120, sortable: false, filter: false },
            { field: "courier_provider", headerName: "Courier Provider", width: 160 },
            { field: "pickup_date", headerName: "Pickup Date & Time", width: 180 },
            { field: "docket_no", headerName: "Docket No", width: 140 },
            { field: "delivery_date", headerName: "Delivery Date & Time", width: 180 },
            {
                headerName: "Action",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(courierActions),
                width: 80,
            },
        ],
        [courierActions]
    );

    // Open modal
    const openStatusModal = useCallback((id: number, status: string) => {
        setSelectedId(id);
        setSelectedStatus(status);
        setStatusModalOpen(true);
    }, []);

    // Handle file input
    const handlePodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        setDeliveryPod(f ?? null);
    };

    // Submit status change (dummy)
    const handleSubmitStatus = (e?: React.FormEvent) => {
        e?.preventDefault();
        console.log({ selectedId, selectedStatus, deliveryDate, deliveryPod, withinTime });
        // TODO: call API to update status
        setStatusModalOpen(false);
        // reset delivery fields
        setDeliveryDate(null);
        setDeliveryPod(null);
        setWithinTime("1");
    };

    // Provide data per tab
    const getDataForTab = (tab: string): CourierRow[] => {
        switch (tab) {
            case "pending":
                return dummyCouriers.pending as unknown as CourierRow[];
            case "dispatched":
                return dummyCouriers.dispatched as unknown as CourierRow[];
            case "not_delivered":
                return dummyCouriers.not_delivered as unknown as CourierRow[];
            case "delivered":
                return dummyCouriers.delivered as unknown as CourierRow[];
            case "rejected":
                return dummyCouriers.rejected as unknown as CourierRow[];
            default:
                return [];
        }
    };

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle>Courier Dashboard</CardTitle>
                    <CardDescription>Manage courier requests and statuses</CardDescription>
                </div>
                <Button onClick={() => navigate(paths.shared.courierCreate)}>Create Courier</Button>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="pending" onValueChange={setActiveTab}>
                    <TabsList className="mx-auto flex justify-center mb-4">
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
                        <TabsTrigger value="not_delivered">Not Delivered</TabsTrigger>
                        <TabsTrigger value="delivered">Delivered</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        <DataTable
                            data={getDataForTab("pending")}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{ defaultColDef: { filter: true, sortable: true }, pagination: true }}
                        />
                    </TabsContent>

                    <TabsContent value="dispatched">
                        <DataTable data={getDataForTab("dispatched")} loading={false} columnDefs={columns} />
                    </TabsContent>

                    <TabsContent value="not_delivered">
                        <DataTable data={getDataForTab("not_delivered")} loading={false} columnDefs={columns} />
                    </TabsContent>

                    <TabsContent value="delivered">
                        <DataTable data={getDataForTab("delivered")} loading={false} columnDefs={columns} />
                    </TabsContent>

                    <TabsContent value="rejected">
                        <DataTable data={getDataForTab("rejected")} loading={false} columnDefs={columns} />
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* Status Modal */}
            <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Status</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmitStatus} className="grid gap-4">
                        <input type="hidden" name="id" value={selectedId ?? ""} />

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select onValueChange={val => setSelectedStatus(val)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Pending</SelectItem>
                                    <SelectItem value="2">Dispatched</SelectItem>
                                    <SelectItem value="3">Not Delivered</SelectItem>
                                    <SelectItem value="4">Delivered</SelectItem>
                                    <SelectItem value="5">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Delivery fields — shown only when status === '4' */}
                        {selectedStatus === "4" && (
                            <div className="delivery grid gap-3">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivery Date & Time</label>
                                    <Input type="datetime-local" value={deliveryDate ?? ""} onChange={e => setDeliveryDate(e.target.value)} />
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivery POD Upload</label>
                                    <Input type="file" onChange={handlePodChange} />
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Delivery within Expected Time</label>
                                    <Select onValueChange={val => setWithinTime(val)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select" />
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
                            <Button variant="outline" onClick={() => setStatusModalOpen(false)} type="button">
                                Close
                            </Button>
                            <Button type="submit">Save changes</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default CourierDashboard;
