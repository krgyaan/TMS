// src/pages/project-dashboard/ProjectDashboard.tsx

import React, { useState, useEffect } from "react";
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
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useProjectDashboardDetails } from "./project-dashboard.hooks";
import { FormProvider, useForm } from "react-hook-form";
import SelectField from "@/components/form/SelectField";

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
    return status == "1" ? "default" : variants[status] || "outline";
};

/* ================================
   MAIN COMPONENT
================================ */
export default function ProjectDashboardPage() {
    const form = useForm<{ projectId: number | null }>({
        defaultValues: { projectId: null },
    });

    const projectId = form.watch("projectId");

    const navigate = useNavigate();
    const { data: projects = [] } = useProjectsMaster();
    // console.log("Projects Data:", projects);
    const { data: projectDetails, isLoading } = useProjectDashboardDetails(projectId);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading project details...</div>;
    }
    // const { tender = [], woBasicDetail = [], woDetail = [], imprests = [], purchaseOrders = [] } = projectDetails;

    const tender = projectDetails?.tender ?? [];
    const woBasicDetail = projectDetails?.woBasicDetail ?? {};
    const woDetail = projectDetails?.woDetail ?? [];
    const imprests = projectDetails?.imprests ?? [];
    const purchaseOrders = projectDetails?.purchaseOrders ?? [];
    console.log("Project Details Data:", projectDetails);

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
                                <FormProvider {...form}>
                                    <SelectField
                                        control={form.control}
                                        name="projectId"
                                        label="Select Project"
                                        placeholder="-- Select Project --"
                                        options={projects.map(p => ({
                                            id: String(p.id),
                                            name: p.projectName,
                                        }))}
                                    />
                                </FormProvider>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {projectId && isLoading && <div className="min-h-screen flex items-center justify-center">Loading project details...</div>}

                {projectId && projectDetails && (
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
                                            <TableCell>{woBasicDetail.parGst ? formatCurrency(Number(woBasicDetail.parGst)) : "-"}</TableCell>
                                            <TableCell>{woBasicDetail.parAmt ? formatCurrency(Number(woBasicDetail.parAmt)) : "-"}</TableCell>
                                            <TableCell>{woBasicDetail.budget ? formatCurrency(Number(woBasicDetail.budget)) : "-"}</TableCell>
                                            <TableCell>{woBasicDetail.poRaised ? formatCurrency(Number(woBasicDetail.poRaised)) : "-"}</TableCell>
                                            <TableCell>{woBasicDetail.woRaised ? formatCurrency(Number(woBasicDetail.woRaised)) : "-"}</TableCell>
                                            <TableCell>{woBasicDetail.expenses_done ? formatCurrency(Number(woBasicDetail.expenses_done)) : "-"}</TableCell>
                                            <TableCell>
                                                {"-"}
                                                {/* <span className="text-muted-foreground text-xs ml-1">("-")</span> */}
                                            </TableCell>
                                            <TableCell>
                                                {"-"}
                                                {/* <span className="text-muted-foreground text-xs ml-1">("-")</span> */}
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
                                        {purchaseOrders.length > 0 ? (
                                            purchaseOrders.map(po => (
                                                <TableRow key={po.id}>
                                                    <TableCell className="font-mono text-sm">{po.poNumber}</TableCell>
                                                    <TableCell>{formatDate(po.createdAt)}</TableCell>
                                                    <TableCell>{po.sellerName}</TableCell>
                                                    <TableCell>{formatCurrency(po.amount)}</TableCell>
                                                    <TableCell>{formatCurrency(po.amountPaid)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button size="sm" variant="outline">
                                                                Raise Payment
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => navigate(paths.operations.viewPoPage(po.id))}>
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
                                            <TableCell className="font-mono text-sm">{woBasicDetail.number}</TableCell>
                                            <TableCell>{formatCurrency(woBasicDetail.parGst)}</TableCell>
                                            <TableCell>{formatDate(woBasicDetail.ldStartDate)}</TableCell>
                                            <TableCell>{formatDate(woBasicDetail.maxLdDate)}</TableCell>
                                            <TableCell>{woBasicDetail.pbgApplicable ? "Yes" : "No"}</TableCell>
                                            <TableCell>{woBasicDetail.contractAgreement ? "Yes" : "No"}</TableCell>
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
                        {imprests.length > 0 && (
                            <div className="flex justify-end">
                                <div className="bg-muted/50 border rounded-md px-4 py-3 flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">Imprest Total Amount</span>
                                    <span className="text-lg font-bold">{formatCurrency(Number(projectDetails.imprestSum))}</span>
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
                                        {imprests.length > 0 ? (
                                            imprests.map(imprest => (
                                                <TableRow key={imprest.id}>
                                                    <TableCell>{imprest.userId}</TableCell>
                                                    <TableCell>{imprest.partyName}</TableCell>
                                                    <TableCell>{imprest.projectName}</TableCell>
                                                    <TableCell>{formatCurrency(imprest.amount)}</TableCell>
                                                    <TableCell>{imprest.category}</TableCell>
                                                    <TableCell>{imprest.remark}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(imprest.status)}>{imprest.status == "1" ? "Approved" : "Pending"}</Badge>
                                                    </TableCell>
                                                    <TableCell>{imprest.approvedDate ? formatDate(imprest.approvedDate) : "-"}</TableCell>
                                                    <TableCell>
                                                        {imprest.invoiceProof.length > 0 ? (
                                                            imprest.invoiceProof.map((proof, idx) => (
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
            </div>
        </div>
    );
}
