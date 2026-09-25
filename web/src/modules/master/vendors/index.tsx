import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertCircle,
    Building2,
    CreditCard,
    FileText,
    Mail,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Users,
} from "lucide-react";
import { useSetVendorOrganizationStatus, useVendorOrganizationsWithRelations } from "@/hooks/api/useVendorOrganizations";
import type { Vendor, VendorAcc, VendorFile, VendorGst, VendorOrganizationWithRelations } from "@/types/api.types";
import { vendorAreaBase } from "./vendorAreaPath";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
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
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed",
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

const Stat = ({ label, value, onClick }: { label: string; value: number; onClick: () => void }) => (
    <button
        type="button"
        onClick={e => {
            e.stopPropagation();
            onClick();
        }}
        className="rounded-md border bg-muted/40 px-2 py-2 text-center transition-colors hover:border-primary/50 hover:bg-accent/60"
    >
        <div className="text-lg font-semibold leading-none tabular-nums">{value}</div>
        <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
    </button>
);

function subtitleOf(org: VendorOrganizationWithRelations): string {
    return [org.alias, org.pan, org.msme].filter(Boolean).join("  ·  ");
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages]);
    const sorted = [...pages]
        .filter(p => p >= 1 && p <= totalPages)
        .sort((a, b) => a - b);
    const out: (number | "...")[] = [];
    let prev = 0;
    for (const p of sorted) {
        if (p - prev > 1) out.push("...");
        out.push(p);
        prev = p;
    }
    return out;
}

const VendorsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const { data: organizations, isLoading, error, refetch } = useVendorOrganizationsWithRelations();
    const setVendorStatus = useSetVendorOrganizationStatus();

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Modal states
    const [gstModal, setGstModal] = useState<{ open: boolean; data: VendorGst[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [accountsModal, setAccountsModal] = useState<{ open: boolean; data: VendorAcc[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [vendorsModal, setVendorsModal] = useState<{ open: boolean; data: Vendor[]; orgName: string }>({ open: false, data: [], orgName: "" });
    const [filesModal, setFilesModal] = useState<{ open: boolean; data: VendorFile[]; orgName: string }>({ open: false, data: [], orgName: "" });

    const filteredRows = useMemo(() => {
        const list = organizations ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter(org =>
            [org.name, org.alias, org.msme, org.pan, org.address].some(value => (value ?? "").toLowerCase().includes(q)),
        );
    }, [organizations, search]);

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleToggleStatus = async (org: VendorOrganizationWithRelations) => {
        const next = !org.status;
        const confirmed = window.confirm(
            next
                ? `Activate "${org.name}"? It will be selectable as a seller in new PO/VWOs.`
                : `Deactivate "${org.name}"? It will be hidden from new PO/VWO seller selection. Existing records stay intact.`,
        );
        if (!confirmed) return;
        try {
            await setVendorStatus.mutateAsync({ id: org.id, status: next });
        } catch {
            // Error toast handled in the hook
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-36 w-full rounded-xl" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Organizations</CardTitle>
                    <CardDescription>Manage vendor organizations and their details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading vendor organizations: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>
                                Vendor Organizations
                                <Badge variant="secondary" className="ml-2">
                                    {totalRows} vendor{totalRows !== 1 ? "s" : ""}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Manage vendor organizations, GST numbers, bank accounts, vendors, and files.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search vendors..."
                                    value={search}
                                    onChange={e => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-8"
                                />
                            </div>
                            <Button variant="default" asChild>
                                <Link to={`${basePath}/create`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Organization
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {pageRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                            <FileText className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No vendors found</p>
                            <p className="text-sm mt-2">
                                {search ? "Try adjusting your search." : "Add your first vendor organization to get started."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {pageRows.map(org => (
                                    <Card
                                        key={org.id}
                                        className={cn(
                                            "cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40",
                                            !org.status && "opacity-70",
                                        )}
                                        onClick={() => navigate(`${basePath}/${org.id}/edit`)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 break-words flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span>{org.name}</span>
                                                    </CardTitle>
                                                    <CardDescription className="mt-1 text-xs truncate">
                                                        {subtitleOf(org) || "—"}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center shrink-0 gap-1">
                                                    <IconAction
                                                        icon={Pencil}
                                                        label="Edit"
                                                        onClick={() => navigate(`${basePath}/${org.id}/edit`)}
                                                    />
                                                    <IconAction
                                                        icon={org.status ? PowerOff : Power}
                                                        label={org.status ? "Deactivate" : "Activate"}
                                                        onClick={() => handleToggleStatus(org)}
                                                        disabled={setVendorStatus.isPending}
                                                    />
                                                </div>
                                            </div>
                                            <Badge variant={org.status ? "default" : "secondary"} className="w-fit">
                                                {org.status ? "Active" : "Inactive"}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Stat
                                                    label="GSTs"
                                                    value={org._counts?.gsts ?? org.gsts?.length ?? 0}
                                                    onClick={() => setGstModal({ open: true, data: org.gsts || [], orgName: org.name })}
                                                />
                                                <Stat
                                                    label="Accounts"
                                                    value={org._counts?.accounts ?? org.accounts?.length ?? 0}
                                                    onClick={() =>
                                                        setAccountsModal({ open: true, data: org.accounts || [], orgName: org.name })
                                                    }
                                                />
                                                <Stat
                                                    label="Vendors"
                                                    value={org._counts?.persons ?? org.persons?.length ?? 0}
                                                    onClick={() => setVendorsModal({ open: true, data: org.persons || [], orgName: org.name })}
                                                />
                                                <Stat
                                                    label="Files"
                                                    value={org._counts?.files ?? org.files?.length ?? 0}
                                                    onClick={() => setFilesModal({ open: true, data: org.files || [], orgName: org.name })}
                                                />
                                            </div>
                                            {org.address && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{org.address}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="flex items-center justify-between px-1 py-3 mt-3 border-t bg-background shrink-0">
                                <div className="text-sm text-muted-foreground">
                                    Total: <strong>{totalRows}</strong>
                                </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0"
                                >
                                    ‹
                                </Button>
                                {getPageNumbers(currentPage, totalPages).map((pg, index) =>
                                    pg === "..." ? (
                                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={pg}
                                            variant={pg === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(pg)}
                                            className="h-8 min-w-8 px-2"
                                        >
                                            {pg}
                                        </Button>
                                    ),
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="h-8 w-8 p-0"
                                >
                                    ›
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Show per Page:</span>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={v => {
                                        setPageSize(Number(v));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZE_OPTIONS.map(size => (
                                            <SelectItem key={size} value={size.toString()}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* GST Numbers Modal */}
            <Dialog open={gstModal.open} onOpenChange={open => setGstModal({ ...gstModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            GST Numbers - {gstModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total GST Numbers: {gstModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {gstModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {gstModal.data.map((gst, index) => (
                                    <div key={gst.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                <div>
                                                    <div className="font-medium">{gst.gstState}</div>
                                                    <div className="text-sm text-muted-foreground font-mono mt-1">{gst.gstNo}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant={gst.status ? "default" : "secondary"}>{gst.status ? "Active" : "Inactive"}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No GST numbers found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bank Accounts Modal */}
            <Dialog open={accountsModal.open} onOpenChange={open => setAccountsModal({ ...accountsModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Accounts - {accountsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Bank Accounts: {accountsModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {accountsModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {accountsModal.data.map((account, index) => (
                                    <div key={account.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                    <div className="font-medium">{account.bankAccountName}</div>
                                                </div>
                                                <div className="ml-11 space-y-1">
                                                    <div className="text-sm text-muted-foreground">
                                                        <span className="font-medium">Account:</span>{" "}
                                                        <span className="font-mono">{account.accountNum}</span>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        <span className="font-medium">IFSC:</span>{" "}
                                                        <span className="font-mono">{account.ifscCode}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={account.status ? "default" : "secondary"}>{account.status ? "Active" : "Inactive"}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                                <p>No bank accounts found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Vendors Modal */}
            <Dialog open={vendorsModal.open} onOpenChange={open => setVendorsModal({ ...vendorsModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Vendors - {vendorsModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Vendors: {vendorsModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {vendorsModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {vendorsModal.data.map((vendor, index) => (
                                    <div key={vendor.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                    <div className="font-medium">{vendor.name}</div>
                                                </div>
                                                <div className="ml-11 space-y-1">
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Mail className="h-3 w-3" />
                                                            {vendor.email}
                                                        </div>
                                                    )}
                                                    {vendor.mobile && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">{vendor.mobile}</div>
                                                    )}
                                                    {vendor.address && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            {vendor.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={vendor.status ? "default" : "secondary"}>{vendor.status ? "Active" : "Inactive"}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Users className="h-12 w-12 mb-4 opacity-50" />
                                <p>No vendors found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Files Modal */}
            <Dialog open={filesModal.open} onOpenChange={open => setFilesModal({ ...filesModal, open })}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Files - {filesModal.orgName}
                        </DialogTitle>
                        <DialogDescription>Total Files: {filesModal.data.length}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {filesModal.data.length > 0 ? (
                            <div className="space-y-3">
                                {filesModal.data.map((file, index) => {
                                    return (
                                        <div key={file.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                        <div className="font-medium">{file.name}</div>
                                                    </div>
                                                    <div className="ml-11 space-y-1">
                                                        <div className="text-sm text-muted-foreground font-mono">{file.filePath}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No files found for this organization</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default VendorsPage;
