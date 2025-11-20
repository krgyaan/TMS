import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Eye, RefreshCw, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

// -----------------------------
// Dummy Data (Replace with API later)
// -----------------------------
const dummyFollowups = {
    ongoing: [
        {
            id: 1,
            area: "North Zone",
            party_name: "Skyline Traders",
            followup_for: "Pending Payment",
            amount: 85000,
            frequency: "Daily",
            status: "In Progress",
            latest_comment: "Called today, customer requested 2 more days",
            updated_at: "2025-01-15",
            start_from: "2024-12-10",
            created_by: "Admin User",
            assigned_to: "John Doe",
            followPerson: [{ name: "Ramesh Kumar", email: "ramesh@skyline.com", phone: "9876543210" }],
        },
        {
            id: 2,
            area: "East Zone",
            party_name: "Bright Solar Pvt Ltd",
            followup_for: "Quotation Approval",
            amount: 120000,
            frequency: "Alternate Days",
            status: "Awaiting Response",
            latest_comment: "Sent revised quotation",
            updated_at: "2025-01-14",
            start_from: "2024-12-22",
            created_by: "Manager",
            assigned_to: "Amit Sharma",
            followPerson: [{ name: "Priya Nair", email: "priya@brightsolar.com", phone: "9998877766" }],
        },
        {
            id: 3,
            area: "South Zone",
            party_name: "GreenVolt Energy",
            followup_for: "Delivery Status",
            amount: 45000,
            frequency: "Weekly",
            status: "In Progress",
            latest_comment: "Shipment confirmed",
            updated_at: "2025-01-10",
            start_from: "2024-11-15",
            created_by: "Admin User",
            assigned_to: "Vikas Yadav",
            followPerson: [{ name: "Rahul Verma", email: "rahul@greenvolt.com", phone: "8888999900" }],
        },
        {
            id: 4,
            area: "West Zone",
            party_name: "UltraTech Systems",
            followup_for: "AMC Renewal",
            amount: 25000,
            frequency: "Daily",
            status: "In Progress",
            latest_comment: "Awaiting approval from director",
            updated_at: "2025-01-11",
            start_from: "2024-12-02",
            created_by: "Support Team",
            assigned_to: "John Doe",
            followPerson: [{ name: "Sanjay Patel", email: "sanjay@uts.com", phone: "9898989898" }],
        },
    ],

    achieved: [
        {
            id: 11,
            area: "North Zone",
            party_name: "Alpha Engineering",
            followup_for: "Payment Collection",
            amount: 70000,
            frequency: "Daily",
            status: "Completed",
            latest_comment: "Payment received",
            updated_at: "2024-12-28",
            start_from: "2024-11-10",
            created_by: "Admin User",
            assigned_to: "Amit Sharma",
            followPerson: [{ name: "Karan Singh", email: "karan@alphaeng.com", phone: "9090909090" }],
        },
    ],

    angry: [
        {
            id: 21,
            area: "South Zone",
            party_name: "Omega Industries",
            followup_for: "Product Issue",
            amount: 0,
            frequency: "Daily",
            status: "Critical",
            latest_comment: "Customer upset about delays",
            updated_at: "2025-01-12",
            start_from: "2024-12-01",
            created_by: "Support Team",
            assigned_to: "Vikas Yadav",
            followPerson: [{ name: "Neha Rao", email: "neha@omegaind.com", phone: "9099988877" }],
        },
    ],

    future: [
        {
            id: 31,
            area: "Central Zone",
            party_name: "Tech Innovations",
            followup_for: "Future Requirement",
            amount: 150000,
            frequency: "Weekly",
            status: "Planned",
            latest_comment: "Follow up scheduled for next month",
            updated_at: "2025-01-02",
            start_from: "2025-03-01",
            created_by: "Business Team",
            assigned_to: "John Doe",
            followPerson: [{ name: "Akshay Bhadra", email: "akshay@techinn.com", phone: "9988776655" }],
        },
        {
            id: 32,
            area: "West Zone",
            party_name: "Future Power Co.",
            followup_for: "Long Term Project",
            amount: 500000,
            frequency: "Monthly",
            status: "Scheduled",
            latest_comment: "Waiting for budget approval",
            updated_at: "2025-01-05",
            start_from: "2025-04-15",
            created_by: "Admin User",
            assigned_to: "Amit Sharma",
            followPerson: [{ name: "Vimal Raj", email: "vimal@futurepower.com", phone: "9933445566" }],
        },
    ],
};

const FollowupsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("ongoing");
    const [date, setDate] = useState<Date>();

    const followUpActions: ActionItem<T>[] = [
        {
            label: "Auto Followup",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: row => {
                console.log("Auto Followup clicked:", row);
                navigate(paths.shared.followUpsEdit);
            },
        },
        {
            label: "Update Status",
            icon: <FileEdit className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: row => {
                handleOpenUpdateModal(row.id); // ✔ use your actual function
            },
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: row => {
                console.log("Viewing row:", row);
                // navigate or open modal etc.
                navigate(paths.shared.followUpsShow);
            },
        },
    ];

    // -------------------------
    // Column Definition for AG Grid
    // -------------------------
    const columns: ColDef[] = useMemo(
        () => [
            { field: "area", headerName: "Area", width: 120 },
            { field: "party_name", headerName: "Organisation", width: 180 },
            {
                field: "followPerson",
                headerName: "Concerned Person",
                width: 200,
                cellRenderer: (params: any) => (
                    <Button variant="outline" size="xs" onClick={() => handleOpenPersonModal(params.data.followPerson)}>
                        See Person
                    </Button>
                ),
            },
            { field: "followup_for", headerName: "Followup For", width: 150 },
            { field: "amount", headerName: "Amount", width: 120 },
            { field: "frequency", headerName: "Frequency", width: 150 },
            { field: "status", headerName: "Status", width: 150 },
            { field: "latest_comment", headerName: "Last Comment", width: 220 },
            { field: "updated_at", headerName: "Last Update", width: 140 },
            { field: "start_from", headerName: "Start Date", width: 120 },
            { field: "created_by", headerName: "Assigned By", width: 150 },
            { field: "assigned_to", headerName: "Assigned To", width: 150 },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(followUpActions),
                width: 25,
            },
        ],
        []
    );

    // -------------------------
    // Update Status Modal State
    // -------------------------
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleOpenUpdateModal = (id: number) => {
        setSelectedId(id);
        setUpdateModalOpen(true);
    };

    // -------------------------
    // Person Modal State
    // -------------------------
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [personList, setPersonList] = useState<any[]>([]);

    const handleOpenPersonModal = (persons: any[]) => {
        setPersonList(persons);
        setPersonModalOpen(true);
    };

    // -------------------------
    // Return JSX
    // -------------------------
    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle>Follow Ups Dashboard</CardTitle>
                    <CardDescription>All follow ups listed</CardDescription>
                </div>
                <Button className="mt-3 w-fit" onClick={() => navigate(paths.shared.followUpsCreate)}>
                    Assign Followup
                </Button>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="ongoing" onValueChange={setActiveTab}>
                    <TabsList className="mx-auto flex justify-center mb-4">
                        <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                        <TabsTrigger value="achieved">Achieved</TabsTrigger>
                        <TabsTrigger value="angry">Angry / External</TabsTrigger>
                        <TabsTrigger value="future">Future Followup</TabsTrigger>
                    </TabsList>

                    {/* --------- ONGOING --------- */}
                    <TabsContent value="ongoing">
                        <DataTable
                            data={dummyFollowups.ongoing}
                            loading={false}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { editable: false, filter: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>

                    {/* --------- ACHIEVED --------- */}
                    <TabsContent value="achieved">
                        <DataTable data={dummyFollowups.achieved} loading={false} columnDefs={columns} />
                    </TabsContent>

                    {/* --------- ANGRY --------- */}
                    <TabsContent value="angry">
                        <DataTable data={dummyFollowups.angry} loading={false} columnDefs={columns} />
                    </TabsContent>

                    {/* --------- FUTURE --------- */}
                    <TabsContent value="future">
                        <DataTable data={dummyFollowups.future} loading={false} columnDefs={columns} />
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* -------------------------------------------
          UPDATE STATUS MODAL
      -------------------------------------------- */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Status</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4">
                        {/* Comment */}
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Comment</label>
                            <Textarea placeholder="Enter comment..." className="min-h-[100px]" />
                        </div>

                        {/* Date */}

                        <DatePicker
                            calendarClassName="min-h-[320px]"
                            label="Next Follow-up Date"
                            date={date}
                            onChange={setDate}
                        />

                        {/* Frequency */}
                        <div className="grid gap-2 w-full">
                            <label className="text-sm font-medium">Frequency</label>
                            <Select>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="alternate">Alternate Days</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="stop">Stop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Submit */}
                        <Button className="mt-2">Update</Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* -------------------------------------------
          PERSON MODAL
      -------------------------------------------- */}
            <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Followup Person</DialogTitle>
                    </DialogHeader>

                    <div>
                        {personList.map((p, i) => (
                            <div key={i} className="mb-2 border-b pb-2">
                                <p>
                                    <strong>Name:</strong> {p.name}
                                </p>
                                <p>
                                    <strong>Email:</strong> {p.email}
                                </p>
                                <p>
                                    <strong>Phone:</strong> {p.phone}
                                </p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default FollowupsPage;
