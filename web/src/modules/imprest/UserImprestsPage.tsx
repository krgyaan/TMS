import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
    useAddImprestAccRemark, useApproveImprest, useDeleteImprest, useImprestList,
    useProofImprest, useTallyImprest,
    useUploadImprestProofs
} from "@/hooks/api/imprest.hooks";
import { useUser } from "@/hooks/api/useUsers";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { cn } from "@/lib/utils";
import type { GridApi } from "ag-grid-community";
import { saveAs } from "file-saver";
import {
    AlertCircle, ArrowLeft, CheckCircle, Download, Eye, FileCheck, ImagePlus,
    ListChecks, Loader2, MessageSquarePlus, Pencil, Plus, Trash2
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import "yet-another-react-lightbox/styles.css";
import { ConfirmUnapproveDialog } from "./components/ConfirmUnapproveDialog";
import { ProofUploadDialog } from "./components/ProofUploadDialog";
import { ProofViewerDialog } from "./components/ProofViewerDialog";
import { RemarkDialog } from "./components/RemarkDialog";
import { SummaryCards } from "./components/SummaryCards";
import { mapProofFiles } from "./helpers/imprest.mapper";
import type { ImprestRow, ProofItem } from "./helpers/imprest.types";

/** Inline Status Toggle */
const StatusToggle: React.FC<{
    active: boolean;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
}> = ({ active, label, icon: Icon, onClick, disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        if (!disabled) onClick(); //  allows toggling in both directions
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {active ? label : `Mark as ${label}`}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

/** Icon Action Button */
const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive";
    disabled?: boolean;
}> = ({ icon: Icon, label, onClick, variant = "default", disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        variant === "destructive"
                            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {label}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const UserImprestsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasPermission, canUpdate, canDelete } = useAuth();
    const { id } = useParams<{ id?: string }>();
    const [isMobile, setIsMobile] = useState(false);
    let userDetails = null;

    const canMutateStatusAdmin = canUpdate("accounts.imprest-admin");
    const isAuthorized = hasPermission("shared.imprests", "read");

    const requestedUserId = id ? Number(id) : null;
    const isOwnPage = !requestedUserId || requestedUserId === user?.id;

    if (requestedUserId) {
        userDetails = useUser(requestedUserId).data;
    }

    if (!isOwnPage && !isAuthorized) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium">Access Denied</p>
                    <p className="text-xs text-muted-foreground">You do not have permission to view this user's imprests.</p>
                </CardContent>
            </Card>
        );
    }

    const [unapproveDialog, setUnapproveDialog] = useState<{
        open: boolean;
        label: string;
        onConfirm: () => void;
    }>({ open: false, label: "", onConfirm: () => {} });

    const handleStatusToggle = (isActive: boolean, label: string, onToggle: () => void) => {
        if (isActive) {
            setUnapproveDialog({
                open: true,
                label,
                onConfirm: () => {
                    onToggle();
                    setUnapproveDialog(d => ({ ...d, open: false }));
                },
            });
        } else {
            onToggle();
        }
    };

    const numericUserId = isOwnPage ? user?.id : requestedUserId;
    const { data, isLoading, error } = useImprestList(numericUserId);
    const addRemarkMutation = useAddImprestAccRemark();
    const summary = data?.summary;
    const rows = data?.imprests ?? [];
    const deleteMutation = useDeleteImprest();
    const uploadProofsMutation = useUploadImprestProofs();
    const approveMutation = useApproveImprest();
    const tallyMutation = useTallyImprest();
    const proofMutation = useProofImprest();
    const [proofModalOpen, setProofModalOpen] = useState(false);
    const [proofs, setProofs] = useState<ProofItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [addProofOpen, setAddProofOpen] = useState(false);
    const [currentProofRowId, setCurrentProofRowId] = useState<number | null>(null);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [searchText, setSearchText] = useState("");
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    const [remarkOpen, setRemarkOpen] = useState(false);
    const [remarkRow, setRemarkRow] = useState<ImprestRow | null>(null);
    const [remarkText, setRemarkText] = useState("");

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        const handler = () => setIsMobile(mq.matches);
        handler();
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const handleDelete = useCallback(
        (row: ImprestRow) => {
            if (confirm("Are you sure you want to delete this record?")) {
                deleteMutation.mutate(row.id);
                2;
            }
        },
        [deleteMutation]
    );

    const openAddProof = (id: number) => {
        setCurrentProofRowId(id);
        setFilesToUpload([]);
        setAddProofOpen(true);
    };

    const submitAddProof = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId || filesToUpload.length === 0) return;
        // console.log("data", filesToUpload);
        uploadProofsMutation.mutate(
            { id: currentProofRowId, files: filesToUpload },
            {
                onSuccess: () => {
                    setAddProofOpen(false);
                    setFilesToUpload([]);
                },
            }
        );
    };

    const openRemarkModal = (row: ImprestRow) => {
        setRemarkRow(row);
        setRemarkText(row.accRemark ?? "");
        setRemarkOpen(true);
    };

    const submitAddRemark = (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!remarkRow || !remarkText.trim()) return;

        addRemarkMutation.mutate(
            {
                id: remarkRow.id,
                remark: remarkText.trim(),
            },
            {
                onSuccess: () => {
                    setRemarkOpen(false);
                    setRemarkText("");
                    setRemarkRow(null);
                },
            }
        );
    };

    const openProofModal = (row: ImprestRow) => {
        if (!Array.isArray(row.invoiceProof)) return;

        const mapped = mapProofFiles(row.invoiceProof);

        if (mapped.length === 0) {
            alert("No proofs available.");
            return;
        }

        setProofs(mapped);
        setCurrentIndex(0);
        setProofModalOpen(true);
    };

    const exportExcel = () => {
        const excelData = rows.map(r => ({
            Date: new Date(r.dateOfExpense || r.createdAt).toLocaleDateString("en-GB"),
            Party: r.partyName,
            Project: r.projectName,
            Category: r.categoryName,
            Amount: r.amount,
            Approved: r.approvalStatus === 1 ? "Yes" : "No",
            Tallied: r.tallyStatus === 1 ? "Yes" : "No",
            "Proof Verified": r.proofStatus === 1 ? "Yes" : "No",
            "Proof Count": r.invoiceProof.length,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Imprest");

        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf]), `Imprest_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const StatusChip = ({ done, doneText, pendingText, color }: { done: boolean; doneText: string; pendingText: string; color: "green" | "blue" | "purple" }) => {
        const colorMap = {
            green: done ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
            blue: done ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
            purple: done ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
        };

        return <button className={cn("px-2 py-1 rounded-full text-[11px] border font-medium", colorMap[color])}>{done ? doneText : pendingText}</button>;
    };

    const imprestAction: ActionItem<ImprestRow>[] = [
        {
            label: "Add Remark",
            onClick: (row: ImprestRow) => openRemarkModal(row),
            icon: <MessageSquarePlus className="h-4 w-4" />,
            visible: () => canUpdate("accounts.imprest-admin"), 
        },
        {
            label: "Add Proof",
            onClick: (row: ImprestRow) => openAddProof(row.id),
            icon: <ImagePlus className="h-4 w-4" />,
        },
        {
            label: "Edit Imprest",
            onClick: (row: ImprestRow) => navigate(paths.shared.imprestEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
            visible: () => canUpdate("accounts.imprest-admin"), 
        },
        {
            label: "Delete",
            onClick: (row: ImprestRow) => handleDelete(row),
            icon: <Trash2 className="h-4 w-4" />,
            visible: () => canDelete("accounts.imprests"), 
        },
    ]

    const columns = useMemo(
        () => [
            {
                field: "createdAt",
                headerName: "Date",
                width: 100,
                valueGetter: (p: ImprestRow) => formatDate(p.createdAt),
            },
            {
                field: "partyName",
                headerName: "Party",
                flex: 1,
                minWidth: 140,
            },
            {
                field: "projectName",
                headerName: "Project",
                flex: 1,
                minWidth: 140,
            },
            {
                field: "categoryName",
                headerName: "Category",
                flex: 1,
                minWidth: 140,
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 90,
                maxWidth: 100,
                valueFormatter: (p: ImprestRow) => formatINR(p.amount),
                cellClass: "",
            },
            {
                field: "remark",
                headerName: "Remarks",
                flex: 1,
                minWidth: 140,
                cellStyle: {
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.4",
                },
                autoHeight: true,
            },
            {
                field: "accRemark",
                headerName: "Acc Remark",
                flex: 1,
                minWidth: 120,
                cellStyle: {
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.4",
                },
                autoHeight: true,
            },
            {
                field: "invoiceProof",
                headerName: "Proofs",
                width: 90,
                sortable: false,
                cellRenderer: p => {
                    const row = p.data as ImprestRow;
                    if (!row.invoiceProof.length) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    return (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline" onClick={() => openProofModal(row)}>
                                        <Eye className="h-3.5 w-3.5" />
                                        {row.invoiceProof.length}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs font-medium">
                                    View proofs
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
            },
            {
                headerName: "Status",
                width: 140,
                sortable: false,
                filter: false,
                cellRenderer: (row: ImprestRow) => {
                    return (
                        <div className="flex items-center gap-1">
                            <StatusToggle
                                active={row.approvalStatus === 1}
                                label="Approved"
                                icon={CheckCircle}
                                onClick={() => handleStatusToggle(row.approvalStatus === 1, "Approved", () => approveMutation.mutate(row.id))}
                                disabled={!canMutateStatusAdmin || approveMutation.isPending}
                            />

                            <StatusToggle
                                active={row.tallyStatus === 1}
                                label="Tallied"
                                icon={ListChecks}
                                onClick={() => handleStatusToggle(row.tallyStatus === 1, "Tallied", () => tallyMutation.mutate(row.id))}
                                disabled={!canMutateStatusAdmin || tallyMutation.isPending}
                            />

                            <StatusToggle
                                active={row.proofStatus === 1}
                                label="Proof Verified"
                                icon={FileCheck}
                                onClick={() => handleStatusToggle(row.proofStatus === 1, "Proof Verified", () => proofMutation.mutate(row.id))}
                                disabled={!canMutateStatusAdmin || proofMutation.isPending}
                            />
                        </div>
                    );
                },
            },
            {
                headerName: "",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(imprestAction),
                pinned: "right",
                width: 57,
            }
        ],
        [approveMutation, tallyMutation, proofMutation, handleDelete]
    );

    /* -------------------- RENDER -------------------- */

    const ImprestMobileCard: React.FC<{ row: ImprestRow }> = ({ row }) => {
        const proofCount = row.invoiceProof.length;

        return (
            <div className="border rounded-xl p-3 mb-3 bg-background shadow-sm">
                {/* Top row: Party + Amount */}
                <div className="flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{row.partyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.projectName}</p>
                    </div>
                    <p className="font-semibold text-sm tabular-nums">{formatINR(row.amount)}</p>
                </div>

                {/* Meta row */}
                <div className="flex justify-between items-center mt-2 text-[11px] text-muted-foreground">
                    <span>{new Date(row.createdAt).toLocaleDateString("en-GB")}</span>

                    {proofCount > 0 && (
                        <button onClick={() => openProofModal(row)} className="flex items-center gap-1 text-primary">
                            <Eye className="h-3.5 w-3.5" />
                            {proofCount} proof{proofCount > 1 && "s"}
                        </button>
                    )}
                </div>

                {/* Status chips */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    <StatusChip done={row.approvalStatus === 1} doneText="Approved" pendingText="Approval Pending" color="green" />

                    <StatusChip done={row.tallyStatus === 1} doneText="Tallied" pendingText="Tally Pending" color="blue" />

                    <StatusChip done={row.proofStatus === 1} doneText="Verified" pendingText="Proof Pending" color="purple" />
                </div>

                {/* Actions row */}
                <div className="flex justify-end gap-3 mt-3 pt-2 border-t">
                    <IconAction icon={ImagePlus} label="Add Proof" onClick={() => openAddProof(row.id)} />
                    {/* <IconAction icon={MessageSquarePlus} label="Add Remark" onClick={() => openRemarkModal(row)} /> */}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading imprests…</span>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium">Failed to load imprests</p>
                    <p className="text-xs text-muted-foreground">Please try again later</p>
                </CardContent>
            </Card>
        );
    }

    const pageTitle = isOwnPage ? "My Imprests" : `${userDetails?.name ?? "User"}'s Imprests`;

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="space-y-4">
                    {/* Top Row: Back + Title */}
                    <div className={cn("flex items-start gap-2", isMobile ? "flex-col" : "flex-row items-center justify-between")}>
                        {/* Left Side: Back + Title */}
                        <div className="flex items-center gap-2">
                            {!isOwnPage && (
                                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}

                            <div>
                                <CardTitle className="leading-none">{pageTitle}</CardTitle>
                                <CardDescription className="mt-1">
                                    {rows.length} {rows.length === 1 ? "record" : "records"}
                                </CardDescription>
                            </div>
                        </div>

                        {/* Right Side Controls (Desktop Only) */}
                        {!isMobile && (
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Search imprests..."
                                    value={searchText}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setSearchText(value);
                                        gridApi?.setGridOption("quickFilterText", value);
                                    }}
                                    className="w-64"
                                />
                                <Button size="sm" title="Add Imprest" onClick={() => navigate(paths.shared.imprestCreate)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Imprest
                                </Button>

                                <Button size="sm" onClick={() => navigate(paths.shared.imprestVoucherByUser(numericUserId!))}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    View Vouchers
                                </Button>

                                <Button size="sm" onClick={() => navigate(paths.shared.imprestPaymentHistoryByUser(numericUserId!))}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    View Payment History
                                </Button>

                                <Button variant="outline" size="sm" onClick={exportExcel}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    {isMobile && (
                        <div className="flex flex-col gap-2">
                            <Input
                                placeholder="Search imprests..."
                                value={searchText}
                                onChange={e => {
                                    const value = e.target.value;
                                    setSearchText(value);
                                    gridApi?.setGridOption("quickFilterText", value);
                                }}
                                className="w-full"
                            />

                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => navigate(paths.shared.imprestCreate)} className="flex-1">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>

                                <Button variant="outline" size="sm" onClick={exportExcel} className="flex-1">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>

            {/* SUMMARY */}
            {/* ================= FINANCIAL SUMMARY ================= */}
            {summary && (
                <div className="mx-3 p-4">
                    <SummaryCards summary={summary} isMobile={isMobile} />
                </div>
            )}

            <CardContent>
                {isMobile ? (
                    <div className="mt-2">
                        {rows.map(row => (
                            <ImprestMobileCard key={row.id} row={row} />
                        ))}
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={columns}
                        onGridReady={params => {
                            setGridApi(params.api);
                            params.api.setQuickFilter(searchText);
                        }}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 20,
                            getRowHeight: params => {
                                return params.node.rowHeight || "auto";
                            },
                            headerHeight: 44,
                            suppressCellFocus: true,
                            onGridReady: params => {
                                setGridApi(params.api);
                            },
                        }}
                    />
                )}
            </CardContent>

            {/* Upload Proof Dialog */}
            <ProofUploadDialog
                open={addProofOpen}
                onOpenChange={setAddProofOpen}
                files={filesToUpload}
                setFiles={setFilesToUpload}
                isPending={uploadProofsMutation.isPending}
                onSubmit={submitAddProof}
            />

            {/* Add Remark Dialog */}
            <RemarkDialog
                open={remarkOpen}
                onOpenChange={setRemarkOpen}
                text={remarkText}
                setText={setRemarkText}
                onSubmit={submitAddRemark}
            />

            <ProofViewerDialog
                open={proofModalOpen}
                onOpenChange={setProofModalOpen}
                proofs={proofs}
                index={currentIndex}
                setIndex={setCurrentIndex}
            />

            <ConfirmUnapproveDialog
                open={unapproveDialog.open}
                onOpenChange={open => setUnapproveDialog(d => ({ ...d, open }))}
                label={unapproveDialog.label}
                onConfirm={unapproveDialog.onConfirm}
            />
        </Card>
    );
};

export default UserImprestsPage;
