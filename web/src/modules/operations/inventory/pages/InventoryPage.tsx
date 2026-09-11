import { useNavigate, useSearchParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Eye, FileText, LayoutDashboard, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useInventoryProjectSummaries } from "@/hooks/api/useInventory";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { InventorySection } from "../components/InventorySection";

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

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-md border bg-muted/40 px-2 py-2 text-center">
            <div className="text-lg font-semibold leading-none tabular-nums">{value}</div>
            <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
        </div>
    );
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([
        1,
        2,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        totalPages - 1,
        totalPages,
    ]);
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

function ProjectSummariesView() {
    const navigate = useNavigate();
    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: "inventory-projects",
        defaultTab: "default",
        defaultPageSize: 50,
    });

    const { data: apiResponse, isLoading, error } = useInventoryProjectSummaries({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
    });

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / pagination.pageSize));

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>All Inventory</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load inventory. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>
                                All Inventory
                                <Badge variant="secondary" className="ml-2">
                                    {totalRows} project{totalRows !== 1 ? "s" : ""}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Project-wise inventory across all projects.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search projects..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>

                {isLoading ? (
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-36 w-full rounded-xl" />
                            ))}
                        </div>
                    </CardContent>
                ) : rows.length === 0 ? (
                    <CardContent>
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                            <FileText className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No inventory</p>
                            <p className="text-sm mt-2">
                                {search ? "Try adjusting your search." : "No projects with inventory are available."}
                            </p>
                        </div>
                    </CardContent>
                ) : (
                    <>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {rows.map(row => (
                                    <Card
                                        key={row.projectId}
                                        className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40"
                                        onClick={() => navigate(paths.operations.inventoryProject(row.projectId))}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                                                        {row.projectName ?? "—"}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1 font-mono text-xs">
                                                        {row.projectCode ?? ""}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center shrink-0">
                                                    <IconAction
                                                        icon={LayoutDashboard}
                                                        label="Open Inventory"
                                                        onClick={() => navigate(paths.operations.inventoryProject(row.projectId))}
                                                    />
                                                    <IconAction
                                                        icon={Eye}
                                                        label="View Project Details"
                                                        onClick={() => navigate(paths.operations.projectShowPage(row.projectId))}
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                <Stat label="Approved PO" value={row.approvedPoCount} />
                                                <Stat label="Approved VWO" value={row.approvedVwoCount} />
                                                <Stat label="Total Items" value={row.totalItems} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>

                        <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
                            <div className="text-sm text-muted-foreground">
                                Total: <strong>{totalRows}</strong>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                                    disabled={pagination.pageIndex === 0 || isLoading}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {getPageNumbers(pagination.pageIndex + 1, totalPages).map((page, index) =>
                                    page === "..." ? (
                                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={page}
                                            variant={page === pagination.pageIndex + 1 ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPagination(p => ({ ...p, pageIndex: page - 1 }))}
                                            disabled={isLoading}
                                            className="h-8 min-w-8 px-2"
                                        >
                                            {page}
                                        </Button>
                                    ),
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                                    disabled={pagination.pageIndex + 1 >= totalPages || isLoading}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Show per Page:</span>
                                <Select
                                    value={pagination.pageSize.toString()}
                                    onValueChange={v => handlePageSizeChange(Number(v))}
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
            </Card>
        </div>
    );
}

function ProjectInventoryView({ projectId }: { projectId: number }) {
    const navigate = useNavigate();
    const { data: overview } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName ?? `Project #${projectId}`;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                Inventory — {projectName}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Items in stock for this project.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate(paths.operations.inventory)}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            All Inventories
                        </Button>
                    </div>
                </CardHeader>
            </Card>
            <InventorySection projectId={projectId} />
        </div>
    );
}

export default function InventoryPage() {
    const [searchParams] = useSearchParams();
    const projectIdParam = searchParams.get("projectId");
    const projectId = projectIdParam ? Number(projectIdParam) : null;

    if (projectId) {
        return <ProjectInventoryView projectId={projectId} />;
    }
    return <ProjectSummariesView />;
}