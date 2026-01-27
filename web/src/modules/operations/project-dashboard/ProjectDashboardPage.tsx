// src/pages/project-dashboard/ProjectDashboard.tsx

import React, { useState, useMemo } from "react";
import { Download, Eye, Plus, CheckCircle2, Clock, AlertCircle, MoreHorizontal, CreditCard } from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

/* ================================
   TYPES
================================ */
interface Project {
    id: number;
    project_name: string;
    tender_id: number;
}

interface TenderDetails {
    id: number;
    number: string;
    name: string;
    par_gst: number;
    par_amt: number;
    wo_budget: number;
    po_raised: number;
    wo_raised: number;
    expenses_done: number;
    planned_gp: number;
    planned_gp_percent: number;
    actual_gp: number;
    actual_gp_percent: number;
    status: string;
}

interface PODetail {
    id: number;
    po_number: string;
    created_at: string;
    seller_name: string;
    amount: number;
    amount_paid: number;
    status: "paid" | "partial" | "pending";
}

interface WODetail {
    id: number;
    wo_number: string;
    wo_value: number;
    ld_start_date: string;
    max_ld_date: string;
    pbg_applicable: boolean;
    contract_agreement: boolean;
}

interface ImprestRecord {
    id: number;
    employee_name: string;
    party_name: string;
    project_name: string;
    amount: number;
    category: string;
    remark: string;
    status: "approved" | "pending" | "rejected";
    approved_date: string | null;
    proofs: string[];
}

/* ================================
   DUMMY DATA
================================ */
const PROJECTS: Project[] = [
    { id: 1, project_name: "Smart City Infrastructure - Phase 1", tender_id: 101 },
    { id: 2, project_name: "Highway Development NH-44", tender_id: 102 },
    { id: 3, project_name: "Metro Rail Extension - Blue Line", tender_id: 103 },
    { id: 4, project_name: "Solar Power Plant Installation", tender_id: 104 },
    { id: 5, project_name: "Water Treatment Facility Upgrade", tender_id: 105 },
];

const TENDER_DETAILS: TenderDetails = {
    id: 101,
    number: "TND-2024-00145",
    name: "Smart City Infrastructure Development Project - Phase 1",
    par_gst: 38135593,
    par_amt: 6864407,
    wo_budget: 35000000,
    po_raised: 12500000,
    wo_raised: 8750000,
    expenses_done: 15250000,
    planned_gp: 7627118,
    planned_gp_percent: 20,
    actual_gp: 6103390,
    actual_gp_percent: 16,
    status: "In Progress",
};

const PO_DETAILS: PODetail[] = [
    { id: 1, po_number: "PO-2024-0145-001", created_at: "2024-11-15", seller_name: "ABC Steel Suppliers Pvt Ltd", amount: 4500000, amount_paid: 4500000, status: "paid" },
    { id: 2, po_number: "PO-2024-0145-002", created_at: "2024-11-20", seller_name: "XYZ Cement Corporation", amount: 3200000, amount_paid: 1600000, status: "partial" },
    { id: 3, po_number: "PO-2024-0145-003", created_at: "2024-11-25", seller_name: "Tech Solutions India", amount: 2800000, amount_paid: 0, status: "pending" },
    { id: 4, po_number: "PO-2024-0145-004", created_at: "2024-12-01", seller_name: "Heavy Machinery Ltd", amount: 2000000, amount_paid: 2000000, status: "paid" },
];

const WO_DETAILS: WODetail = {
    id: 1,
    wo_number: "WO-2024-0145",
    wo_value: 38135593,
    ld_start_date: "2025-06-15",
    max_ld_date: "2025-07-15",
    pbg_applicable: true,
    contract_agreement: true,
};

const IMPREST_RECORDS: ImprestRecord[] = [
    {
        id: 1,
        employee_name: "Rajesh Kumar",
        party_name: "Local Hardware Store",
        project_name: "Smart City Infrastructure",
        amount: 25000,
        category: "Materials",
        remark: "Emergency pipe fittings",
        status: "approved",
        approved_date: "2024-12-01",
        proofs: ["receipt1.pdf"],
    },
    {
        id: 2,
        employee_name: "Priya Sharma",
        party_name: "Transport Services",
        project_name: "Smart City Infrastructure",
        amount: 15000,
        category: "Transport",
        remark: "Site equipment transport",
        status: "approved",
        approved_date: "2024-12-03",
        proofs: ["bill1.pdf", "bill2.pdf"],
    },
    {
        id: 3,
        employee_name: "Amit Patel",
        party_name: "Electrical Supplies",
        project_name: "Smart City Infrastructure",
        amount: 35000,
        category: "Electrical",
        remark: "Cable and switches",
        status: "pending",
        approved_date: null,
        proofs: [],
    },
    {
        id: 4,
        employee_name: "Sneha Gupta",
        party_name: "Safety Equipment Co",
        project_name: "Smart City Infrastructure",
        amount: 18500,
        category: "Safety",
        remark: "PPE for workers",
        status: "approved",
        approved_date: "2024-12-05",
        proofs: ["invoice.pdf"],
    },
    {
        id: 5,
        employee_name: "Vikram Singh",
        party_name: "Office Supplies",
        project_name: "Smart City Infrastructure",
        amount: 8500,
        category: "Miscellaneous",
        remark: "Site office supplies",
        status: "rejected",
        approved_date: null,
        proofs: [],
    },
];

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
    return "₹ " + new Intl.NumberFormat("en-IN").format(amount);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        approved: "default",
        paid: "default",
        pending: "secondary",
        partial: "secondary",
        rejected: "destructive",
    };
    return variants[status.toLowerCase()] || "secondary";
};

/* ================================
   MAIN COMPONENT
================================ */
export default function ProjectDashboardPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(1);
    const navigate = useNavigate();

    const imprestSum = useMemo(() => {
        return IMPREST_RECORDS.filter(i => i.status === "approved").reduce((sum, i) => sum + i.amount, 0);
    }, []);

    return (
        <div className="min-h-screen bg-background py-6">
            <div className="container max-w-7xl mx-auto px-4 space-y-6">
                {/* Header */}
                <h1 className="text-2xl font-bold">Project Dashboard</h1>

                {/* Project Selection */}
                <Card className="px-2 py-4">
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 ">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Select Project</label>
                                <Select value={selectedProjectId?.toString()} onValueChange={v => setSelectedProjectId(Number(v))}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="-- Select Project --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROJECTS.map(project => (
                                            <SelectItem key={project.id} value={project.id.toString()}>
                                                {project.project_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {selectedProjectId && (
                    <>
                        {/* Project Details Table */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold uppercase">Project Details</CardTitle>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => navigate(paths.operations.raisePoForm)}>
                                        <Plus className="mr-1 h-4 w-4" /> Raise PO
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        <Plus className="mr-1 h-4 w-4" /> Raise WO
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 px-2">
                                            <TableHead>WO Value (Pre GST)</TableHead>
                                            <TableHead>WO Value (GST Amt)</TableHead>
                                            <TableHead>WO Total Budget</TableHead>
                                            <TableHead>PO Raised</TableHead>
                                            <TableHead>WO Raised</TableHead>
                                            <TableHead>Expenses Done</TableHead>
                                            <TableHead>Planned GP</TableHead>
                                            <TableHead>Actual GP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="px-2">
                                            <TableCell>{formatCurrency(TENDER_DETAILS.par_gst)}</TableCell>
                                            <TableCell>{formatCurrency(TENDER_DETAILS.par_amt)}</TableCell>
                                            <TableCell>{formatCurrency(TENDER_DETAILS.wo_budget)}</TableCell>
                                            <TableCell>{formatCurrency(TENDER_DETAILS.po_raised)}</TableCell>
                                            <TableCell>{formatCurrency(TENDER_DETAILS.wo_raised)}</TableCell>
                                            <TableCell>{formatCurrency(TENDER_DETAILS.expenses_done)}</TableCell>
                                            <TableCell>
                                                {formatCurrency(TENDER_DETAILS.planned_gp)}
                                                <span className="text-muted-foreground text-xs ml-1">({TENDER_DETAILS.planned_gp_percent}%)</span>
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(TENDER_DETAILS.actual_gp)}
                                                <span className="text-muted-foreground text-xs ml-1">({TENDER_DETAILS.actual_gp_percent}%)</span>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* PO Table */}
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-base font-bold uppercase">PO Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>PO No.</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Party Name</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Amount Paid</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {PO_DETAILS.length > 0 ? (
                                            PO_DETAILS.map(po => (
                                                <TableRow key={po.id}>
                                                    <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                                                    <TableCell>{formatDate(po.created_at)}</TableCell>
                                                    <TableCell>{po.seller_name}</TableCell>
                                                    <TableCell>{formatCurrency(po.amount)}</TableCell>
                                                    <TableCell>{formatCurrency(po.amount_paid)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button size="sm" variant="outline">
                                                                Raise Payment
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => navigate(paths.operations.viewPoPage)}>
                                                                View
                                                            </Button>
                                                            <Button size="sm" variant="outline">
                                                                Download PO
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                    No PO records found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* WO Table */}
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-base font-bold uppercase">WO Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>WO No.</TableHead>
                                            <TableHead>WO Value</TableHead>
                                            <TableHead>LD Start Date</TableHead>
                                            <TableHead>Max LD Date</TableHead>
                                            <TableHead>PBG Applicable</TableHead>
                                            <TableHead>Contract Agreement</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-sm">{WO_DETAILS.wo_number}</TableCell>
                                            <TableCell>{formatCurrency(WO_DETAILS.wo_value)}</TableCell>
                                            <TableCell>{formatDate(WO_DETAILS.ld_start_date)}</TableCell>
                                            <TableCell>{formatDate(WO_DETAILS.max_ld_date)}</TableCell>
                                            <TableCell>{WO_DETAILS.pbg_applicable ? "Yes" : "No"}</TableCell>
                                            <TableCell>{WO_DETAILS.contract_agreement ? "Yes" : "No"}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="outline">
                                                        WO Acceptance
                                                    </Button>
                                                    <Button size="sm" variant="outline">
                                                        WO Update
                                                    </Button>
                                                    <Button size="sm" variant="outline">
                                                        View
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Imprest Total */}
                        {IMPREST_RECORDS.length > 0 && (
                            <div className="flex justify-end">
                                <div className="bg-muted/50 border rounded-md px-4 py-3 flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">Imprest Total Amount</span>
                                    <span className="text-lg font-bold">{formatCurrency(imprestSum)}</span>
                                </div>
                            </div>
                        )}

                        {/* Employee Imprest Table */}
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-base font-bold uppercase text-center">Employee Imprest Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Party Name</TableHead>
                                            <TableHead>Project Name</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Remark</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Approved Date</TableHead>
                                            <TableHead>Proof</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {IMPREST_RECORDS.length > 0 ? (
                                            IMPREST_RECORDS.map(imprest => (
                                                <TableRow key={imprest.id}>
                                                    <TableCell>{imprest.employee_name}</TableCell>
                                                    <TableCell>{imprest.party_name}</TableCell>
                                                    <TableCell>{imprest.project_name}</TableCell>
                                                    <TableCell>{formatCurrency(imprest.amount)}</TableCell>
                                                    <TableCell>{imprest.category}</TableCell>
                                                    <TableCell>{imprest.remark}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(imprest.status)}>
                                                            {imprest.status.charAt(0).toUpperCase() + imprest.status.slice(1)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{imprest.approved_date ? formatDate(imprest.approved_date) : "-"}</TableCell>
                                                    <TableCell>
                                                        {imprest.proofs.length > 0 ? (
                                                            imprest.proofs.map((proof, idx) => (
                                                                <Button key={idx} size="sm" variant="outline" className="mr-1">
                                                                    View
                                                                </Button>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted-foreground">No Proof</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center text-muted-foreground">
                                                    No Employee Imprest Records Found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Empty State */}
                {!selectedProjectId && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">Please select a project to view details.</CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
