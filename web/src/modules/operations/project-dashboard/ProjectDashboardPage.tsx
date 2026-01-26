// src/pages/project-dashboard/ProjectDashboard.tsx

import React, { useState, useMemo } from "react";
import {
    ChevronDown,
    ChevronRight,
    Download,
    FileText,
    Building2,
    Calendar,
    IndianRupee,
    Receipt,
    ClipboardList,
    Users,
    Eye,
    Printer,
    CreditCard,
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    Briefcase,
    TrendingUp,
    Target,
    FileCheck,
    Banknote,
    ArrowUpRight,
    MoreHorizontal,
} from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
    organization: string;
    tender_type: string;
    submission_date: string;
    opening_date: string;
    estimated_value: number;
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
    acceptance_status: "accepted" | "pending" | "rejected";
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

interface EMDDetail {
    id: number;
    amount: number;
    bank_name: string;
    validity_date: string;
    status: "active" | "released" | "forfeited";
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
    organization: "Municipal Corporation of Delhi",
    tender_type: "Open Tender",
    submission_date: "2024-12-15",
    opening_date: "2024-12-20",
    estimated_value: 45000000,
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
    acceptance_status: "accepted",
};

const EMD_DETAILS: EMDDetail[] = [
    { id: 1, amount: 900000, bank_name: "State Bank of India", validity_date: "2025-06-30", status: "active" },
    { id: 2, amount: 450000, bank_name: "HDFC Bank", validity_date: "2025-03-15", status: "released" },
];

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
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        approved: "default",
        paid: "default",
        active: "default",
        accepted: "default",
        pending: "secondary",
        partial: "secondary",
        rejected: "destructive",
        forfeited: "destructive",
        released: "outline",
    };
    return variants[status.toLowerCase()] || "secondary";
};

/* ================================
   COLLAPSIBLE SECTION COMPONENT
================================ */
interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = false, badge }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
                        <span className="font-semibold text-foreground">{title}</span>
                        {badge && (
                            <Badge variant="secondary" className="ml-2">
                                {badge}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isOpen ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                        ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                        )}
                    </div>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
                <div className="p-4 border rounded-lg bg-card">{children}</div>
            </CollapsibleContent>
        </Collapsible>
    );
};

/* ================================
   STAT CARD COMPONENT
================================ */
interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, trend, color = "primary" }) => {
    return (
        <div className="relative overflow-hidden p-4 rounded-xl border bg-card hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-bold tracking-tight">{value}</p>
                    {subValue && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                            {subValue}
                        </p>
                    )}
                </div>
                <div className={`p-2.5 rounded-xl bg-${color}/10`}>{icon}</div>
            </div>
        </div>
    );
};

/* ================================
   MAIN COMPONENT
================================ */
export default function ProjectDashboardPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(1);

    const selectedProject = useMemo(() => {
        return PROJECTS.find(p => p.id === selectedProjectId);
    }, [selectedProjectId]);

    const imprestSum = useMemo(() => {
        return IMPREST_RECORDS.filter(i => i.status === "approved").reduce((sum, i) => sum + i.amount, 0);
    }, []);

    const budgetUtilization = useMemo(() => {
        if (!TENDER_DETAILS.wo_budget) return 0;
        return Math.round((TENDER_DETAILS.expenses_done / TENDER_DETAILS.wo_budget) * 100);
    }, []);

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-12">
                <div className="mx-auto max-w-7xl p-6 space-y-8">
                    {/* ===== HEADER ===== */}
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Project Dashboard</h1>
                        </div>
                    </div>

                    {/* ===== PROJECT SELECTOR ===== */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Project</label>
                                    <Select value={selectedProjectId?.toString()} onValueChange={v => setSelectedProjectId(Number(v))}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="-- Select Project --" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PROJECTS.map(project => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                        {project.project_name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedProject && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Tender ID</label>
                                            <div className="h-11 flex items-center px-3 border rounded-md bg-muted/30">
                                                <span className="font-mono text-sm">{TENDER_DETAILS.number}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                                            <div className="h-11 flex items-center px-3 border rounded-md bg-muted/30">
                                                <Badge variant="default" className="bg-emerald-500">
                                                    {TENDER_DETAILS.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {selectedProjectId && (
                        <>
                            {/* ===== QUICK STATS ===== */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <StatCard label="WO Value (Pre GST)" value={formatCurrency(TENDER_DETAILS.par_gst)} icon={<IndianRupee className="h-4 w-4 text-primary" />} />
                                <StatCard label="WO Value (GST Amt)" value={formatCurrency(TENDER_DETAILS.par_gst)} icon={<IndianRupee className="h-4 w-4 text-primary" />} />
                                <StatCard
                                    label="WO Total Budget"
                                    value={formatCurrency(TENDER_DETAILS.wo_budget)}
                                    // subValue={`${budgetUtilization}% utilized`}
                                    icon={<Target className="h-4 w-4 text-sky-500" />}
                                    trend="up"
                                />
                                <StatCard
                                    label="Expenses Done"
                                    value={formatCurrency(TENDER_DETAILS.planned_gp)}
                                    // subValue={`${TENDER_DETAILS.planned_gp_percent}%`}
                                    icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                                />
                                <StatCard
                                    label="Planned GP"
                                    value={formatCurrency(TENDER_DETAILS.planned_gp)}
                                    // subValue={`${TENDER_DETAILS.planned_gp_percent}%`}
                                    icon={<Banknote className="h-4 w-4 text-amber-500" />}
                                />
                                <StatCard
                                    label="Actual GP"
                                    value={formatCurrency(TENDER_DETAILS.actual_gp)}
                                    // subValue={`${TENDER_DETAILS.actual_gp_percent}%`}
                                    icon={<Banknote className="h-4 w-4 text-amber-500" />}
                                />
                            </div>

                            {/* ===== COLLAPSIBLE TENDER DETAILS ===== */}
                            {/* <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Tender Information
                                    </CardTitle>
                                    <CardDescription>View and manage all tender-related details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <CollapsibleSection title="Tender Details" icon={<FileText className="h-4 w-4" />} defaultOpen={true}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Tender Number</p>
                                                <p className="font-semibold font-mono">{TENDER_DETAILS.number}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Organization</p>
                                                <p className="font-semibold">{TENDER_DETAILS.organization}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Tender Type</p>
                                                <Badge variant="outline">{TENDER_DETAILS.tender_type}</Badge>
                                            </div>
                                            <div className="space-y-1 md:col-span-3">
                                                <p className="text-xs text-muted-foreground uppercase">Tender Name</p>
                                                <p className="font-semibold">{TENDER_DETAILS.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Submission Date</p>
                                                <p className="font-medium flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(TENDER_DETAILS.submission_date)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Opening Date</p>
                                                <p className="font-medium flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(TENDER_DETAILS.opening_date)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase">Estimated Value</p>
                                                <p className="font-semibold text-primary">{formatCurrency(TENDER_DETAILS.estimated_value)}</p>
                                            </div>
                                        </div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="EMD Details" icon={<CreditCard className="h-4 w-4" />} badge={`${EMD_DETAILS.length} Records`}>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Bank Name</TableHead>
                                                    <TableHead>Validity Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {EMD_DETAILS.map(emd => (
                                                    <TableRow key={emd.id}>
                                                        <TableCell className="font-medium">{formatCurrency(emd.amount)}</TableCell>
                                                        <TableCell>{emd.bank_name}</TableCell>
                                                        <TableCell>{formatDate(emd.validity_date)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusBadgeVariant(emd.status)}>{emd.status.charAt(0).toUpperCase() + emd.status.slice(1)}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Document Checklist" icon={<ClipboardList className="h-4 w-4" />}>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { name: "Technical Bid", completed: true },
                                                { name: "Financial Bid", completed: true },
                                                { name: "Company Profile", completed: true },
                                                { name: "Experience Certificates", completed: true },
                                                { name: "Bank Guarantee", completed: true },
                                                { name: "Authorization Letter", completed: false },
                                                { name: "GST Certificate", completed: true },
                                                { name: "PAN Card", completed: true },
                                            ].map((doc, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                                                        doc.completed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                                                    }`}
                                                >
                                                    {doc.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                                                    <span className="text-sm font-medium">{doc.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Bid Details" icon={<Receipt className="h-4 w-4" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                                    <span className="text-sm text-muted-foreground">Bid Amount (Pre GST)</span>
                                                    <span className="font-semibold">{formatCurrency(TENDER_DETAILS.par_gst)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                                    <span className="text-sm text-muted-foreground">GST Amount</span>
                                                    <span className="font-semibold">{formatCurrency(TENDER_DETAILS.par_amt)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                                                    <span className="text-sm font-medium">Total Bid Amount</span>
                                                    <span className="font-bold text-primary">{formatCurrency(TENDER_DETAILS.par_gst + TENDER_DETAILS.par_amt)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="p-4 border rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-2">Budget Utilization</p>
                                                    <div className="flex items-center gap-4">
                                                        <Progress value={budgetUtilization} className="flex-1" />
                                                        <span className="text-sm font-semibold">{budgetUtilization}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Tender Result" icon={<FileCheck className="h-4 w-4" />}>
                                        <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <div className="p-3 bg-emerald-100 rounded-full">
                                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-emerald-800">Tender Won - L1</p>
                                                <p className="text-sm text-emerald-600">Awarded on 25-Dec-2024</p>
                                            </div>
                                        </div>
                                    </CollapsibleSection>
                                </CardContent>
                            </Card> */}

                            {/* ===== PROJECT DETAILS TABLE ===== */}
                            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            Project Details
                                        </CardTitle>
                                        {/* <CardDescription>Work order values and expense tracking</CardDescription> */}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline">
                                            <Plus className="mr-2 h-4 w-4" /> Raise PO
                                        </Button>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" /> Raise WO
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
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
                                                <TableRow>
                                                    <TableCell className="font-medium">{formatCurrency(TENDER_DETAILS.par_gst)}</TableCell>
                                                    <TableCell>{formatCurrency(TENDER_DETAILS.par_amt)}</TableCell>
                                                    <TableCell className="font-semibold text-primary">{formatCurrency(TENDER_DETAILS.wo_budget)}</TableCell>
                                                    <TableCell>{formatCurrency(TENDER_DETAILS.po_raised)}</TableCell>
                                                    <TableCell>{formatCurrency(TENDER_DETAILS.wo_raised)}</TableCell>
                                                    <TableCell>
                                                        <span className="text-amber-600">{formatCurrency(TENDER_DETAILS.expenses_done)}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{formatCurrency(TENDER_DETAILS.planned_gp)}</span>
                                                            <span className="text-xs text-muted-foreground">({TENDER_DETAILS.planned_gp_percent}%)</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span
                                                                className={
                                                                    TENDER_DETAILS.actual_gp_percent < TENDER_DETAILS.planned_gp_percent ? "text-amber-600" : "text-emerald-600"
                                                                }
                                                            >
                                                                {formatCurrency(TENDER_DETAILS.actual_gp)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">({TENDER_DETAILS.actual_gp_percent}%)</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ===== PO & WO TABLES ===== */}
                            <Tabs defaultValue="po" className="space-y-4">
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="po" className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4" />
                                        PO Details
                                        <Badge variant="secondary" className="ml-1">
                                            {PO_DETAILS.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="wo" className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        WO Details
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="po">
                                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-lg">Purchase Orders</CardTitle>
                                            <CardDescription>Track all purchase orders and payment status</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>PO No.</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Party Name</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Amount Paid</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {PO_DETAILS.map(po => (
                                                        <TableRow key={po.id} className="hover:bg-muted/30">
                                                            <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                                                            <TableCell>{formatDate(po.created_at)}</TableCell>
                                                            <TableCell className="max-w-[200px] truncate">{po.seller_name}</TableCell>
                                                            <TableCell className="text-right font-medium">{formatCurrency(po.amount)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={po.amount_paid === po.amount ? "text-emerald-600" : "text-amber-600"}>
                                                                    {formatCurrency(po.amount_paid)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getStatusBadgeVariant(po.status)}>{po.status.charAt(0).toUpperCase() + po.status.slice(1)}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem>
                                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                                            Raise Payment
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View Details
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem>
                                                                            <Download className="mr-2 h-4 w-4" />
                                                                            Download PO
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="wo">
                                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-lg">Work Order Details</CardTitle>
                                            <CardDescription>Work order information and milestone tracking</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>WO No.</TableHead>
                                                        <TableHead className="text-right">WO Value</TableHead>
                                                        <TableHead>LD Start Date</TableHead>
                                                        <TableHead>Max LD Date</TableHead>
                                                        <TableHead>PBG Applicable</TableHead>
                                                        <TableHead>Contract Agreement</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow className="hover:bg-muted/30">
                                                        <TableCell className="font-mono text-sm">{WO_DETAILS.wo_number}</TableCell>
                                                        <TableCell className="text-right font-semibold">{formatCurrency(WO_DETAILS.wo_value)}</TableCell>
                                                        <TableCell>{formatDate(WO_DETAILS.ld_start_date)}</TableCell>
                                                        <TableCell>{formatDate(WO_DETAILS.max_ld_date)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={WO_DETAILS.pbg_applicable ? "default" : "secondary"}>{WO_DETAILS.pbg_applicable ? "Yes" : "No"}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={WO_DETAILS.contract_agreement ? "default" : "secondary"}>
                                                                {WO_DETAILS.contract_agreement ? "Yes" : "No"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="sm" variant="outline">
                                                                    WO Acceptance
                                                                </Button>
                                                                <Button size="sm" variant="outline">
                                                                    WO Update
                                                                </Button>
                                                                <Button size="sm" variant="ghost">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>

                            {/* ===== EMPLOYEE IMPREST TABLE ===== */}
                            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="h-5 w-5 text-primary" />
                                            Employee Imprest Details
                                        </CardTitle>
                                        <CardDescription>Track employee expense requests and approvals</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                                            <span className="text-sm text-muted-foreground">Total Imprest Amount:</span>
                                            <span className="text-lg font-bold text-primary">{formatCurrency(imprestSum)}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Party Name</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Remark</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Approved Date</TableHead>
                                                <TableHead>Proof</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {IMPREST_RECORDS.map(imprest => (
                                                <TableRow key={imprest.id} className="hover:bg-muted/30">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                    {imprest.employee_name
                                                                        .split(" ")
                                                                        .map(n => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{imprest.employee_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{imprest.party_name}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate">{imprest.project_name}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(imprest.amount)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{imprest.category}</Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px] truncate text-muted-foreground">{imprest.remark}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(imprest.status)}>
                                                            {imprest.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                                            {imprest.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                                                            {imprest.status === "rejected" && <AlertCircle className="mr-1 h-3 w-3" />}
                                                            {imprest.status.charAt(0).toUpperCase() + imprest.status.slice(1)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{imprest.approved_date ? formatDate(imprest.approved_date) : "-"}</TableCell>
                                                    <TableCell>
                                                        {imprest.proofs.length > 0 ? (
                                                            <div className="flex gap-1">
                                                                {imprest.proofs.map((proof, idx) => (
                                                                    <Tooltip key={idx}>
                                                                        <TooltipTrigger asChild>
                                                                            <Button size="sm" variant="ghost" className="h-7 px-2">
                                                                                <Eye className="h-3 w-3" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>View {proof}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">No Proof</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Empty State */}
                    {!selectedProjectId && (
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="p-4 bg-muted rounded-full mb-4">
                                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
                                <p className="text-muted-foreground text-center max-w-md">Please select a project from the dropdown above to view its dashboard details.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
