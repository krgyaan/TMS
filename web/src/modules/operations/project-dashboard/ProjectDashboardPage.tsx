// src/pages/project-dashboard/ProjectDashboard.tsx

import React, { useState, useMemo, useCallback } from "react";
import { 
    Download, 
    Eye, 
    Plus, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    X, 
    FileText, 
    Image as ImageIcon,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    AlertCircle
} from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useProjectDashboardDetails } from "./project-dashboard.hooks";
import { FormProvider, useForm } from "react-hook-form";
import SelectField from "@/components/form/SelectField";
import { cn } from "@/lib/utils";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { GridApi } from "ag-grid-community";

/* ================================
   UTILITY FUNCTIONS
================================ */
const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "-";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusVariant = (status: string | number): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 1 || status === "1" || status === "approved") return "default";
    if (status === "rejected") return "destructive";
    return "secondary";
};

const getStatusLabel = (status: string | number): string => {
    if (status === 1 || status === "1") return "Approved";
    if (status === 0 || status === "0") return "Pending";
    return String(status);
};

/* ================================
   STAT CARD COMPONENT
================================ */
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </p>
                <p className="text-xl font-bold tabular-nums tracking-tight">
                    {value || "-"}
                </p>
            </div>
            {icon && (
                <div className="rounded-lg bg-primary/10 p-2">
                    {icon}
                </div>
            )}
        </div>
    </div>
);

/* ================================
   ENHANCED PROOF VIEWER SHEET
================================ */
interface ProofViewerProps {
    isOpen: boolean;
    onClose: () => void;
    proofs: string[];
    imprestInfo?: {
        employee: string;
        amount: number;
        category: string;
        date?: string;
        partyName?: string;
        remark?: string;
    };
}

const ProofViewer: React.FC<ProofViewerProps> = ({ 
    isOpen, 
    onClose, 
    proofs, 
    imprestInfo 
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Reset state when proofs change or sheet opens
    React.useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setZoom(1);
            setRotation(0);
            setImageError(false);
            setImageLoading(true);
        }
    }, [proofs, isOpen]);

    // Reset error and loading state when index changes
    React.useEffect(() => {
        setImageError(false);
        setImageLoading(true);
    }, [currentIndex]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : proofs.length - 1));
        setZoom(1);
        setRotation(0);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < proofs.length - 1 ? prev + 1 : 0));
        setZoom(1);
        setRotation(0);
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    // Check if URL is valid (absolute URL with http/https)
    const isValidUrl = (url: string): boolean => {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return url.startsWith('http://') || url.startsWith('https://');
        }
    };

    // Get full URL (handle relative paths)
    const getFullUrl = (url: string): string => {
        if (!url) return '';
        if (isValidUrl(url)) return url;
        
        // If it's a relative path, prepend the API base URL
        // Adjust this based on your backend URL structure
        const baseUrl = "https://tmsv2.volksenergie.in/uploads/employeeimprest";
        
        // Remove leading slash if present to avoid double slashes
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${cleanPath}`;
    };

    // Determine file type from URL
    const getFileType = (url: string): 'image' | 'pdf' | 'document' => {
        if (!url) return 'document';
        const lowerUrl = url.toLowerCase();
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
            return 'image';
        }
        
        if (lowerUrl.includes('.pdf')) {
            return 'pdf';
        }
        
        return 'document';
    };

    // Get file name from URL
    const getFileName = (url: string): string => {
        if (!url) return 'document';
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop() || 'document';
            return fileName;
        } catch {
            const parts = url.split('/');
            return parts[parts.length - 1] || 'document';
        }
    };

    const currentProof = proofs[currentIndex] || '';
    const fullUrl = getFullUrl(currentProof);
    const fileType = getFileType(currentProof);
    const fileName = getFileName(currentProof);

    // Render content based on file type
    const renderProofContent = () => {
        if (!currentProof) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="rounded-full bg-muted p-4">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No preview available</p>
                </div>
            );
        }

        // Image rendering
        if (fileType === 'image' && !imageError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
                    {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    )}
                    <img
                        src={fullUrl}
                        alt={`Proof ${currentIndex + 1}`}
                        className={cn(
                            "max-w-none transition-transform duration-200",
                            imageLoading && "opacity-0"
                        )}
                        style={{
                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        }}
                        onLoad={() => setImageLoading(false)}
                        onError={() => {
                            setImageError(true);
                            setImageLoading(false);
                        }}
                    />
                </div>
            );
        }

        // PDF rendering - show placeholder with action buttons
        if (fileType === 'pdf') {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-5">
                        <FileText className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center space-y-2 max-w-[280px]">
                        <p className="text-base font-semibold">PDF Document</p>
                        <p className="text-sm text-muted-foreground truncate w-full" title={fileName}>
                            {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            PDF preview is not available inline. Please open in a new tab or download to view.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(fullUrl, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open PDF
                        </Button>
                        <Button 
                            size="sm"
                            variant="default"
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = fullUrl;
                                link.download = fileName;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </div>
            );
        }

        // Fallback for other document types or errored images
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                <div className="rounded-full bg-muted p-5">
                    {imageError ? (
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    ) : (
                        <FileText className="h-12 w-12 text-muted-foreground" />
                    )}
                </div>
                <div className="text-center space-y-2 max-w-[280px]">
                    <p className="text-base font-semibold">
                        {imageError ? 'Failed to Load Image' : 'Document Preview'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate w-full" title={fileName}>
                        {fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {imageError 
                            ? 'The image could not be loaded. Try opening in a new tab or downloading.'
                            : 'Preview not available for this file type. Click below to view or download.'}
                    </p>
                </div>
                <div className="flex gap-2 mt-2">
                    <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(fullUrl, '_blank')}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open File
                    </Button>
                    <Button 
                        size="sm"
                        variant="default"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = fullUrl;
                            link.download = fileName;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
                {/* Header */}
                <div className="p-6 pb-0">
                    <SheetHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <SheetTitle className="text-xl font-semibold">
                                    Invoice Proofs
                                </SheetTitle>
                                <SheetDescription className="mt-1">
                                    {proofs.length} document{proofs.length !== 1 ? 's' : ''} attached
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Imprest Info Card */}
                    {imprestInfo && (
                        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground text-xs">Employee</span>
                                    <p className="font-medium truncate">{imprestInfo.employee || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs">Amount</span>
                                    <p className="font-semibold text-primary">
                                        {formatCurrency(imprestInfo.amount)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs">Category</span>
                                    <p className="font-medium">{imprestInfo.category || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs">Party</span>
                                    <p className="font-medium truncate">{imprestInfo.partyName || "-"}</p>
                                </div>
                                {imprestInfo.remark && (
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground text-xs">Remark</span>
                                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                                            {imprestInfo.remark}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="my-4" />

                {/* Content */}
                <div className="flex-1 overflow-hidden px-6">
                    {proofs.length > 0 ? (
                        <div className="flex flex-col h-full">
                            {/* Navigation & Controls */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={handlePrev}
                                        disabled={proofs.length <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-3 py-1 rounded-md bg-muted min-w-[60px] text-center">
                                        {currentIndex + 1} / {proofs.length}
                                    </span>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={handleNext}
                                        disabled={proofs.length <= 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Image Controls - Only show for images that loaded successfully */}
                                {fileType === 'image' && !imageError && (
                                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={handleZoomOut}
                                                        disabled={zoom <= 0.5}
                                                    >
                                                        <ZoomOut className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Zoom Out</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <span className="text-xs font-mono w-10 text-center text-muted-foreground">
                                            {Math.round(zoom * 100)}%
                                        </span>

                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={handleZoomIn}
                                                        disabled={zoom >= 3}
                                                    >
                                                        <ZoomIn className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Zoom In</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <Separator orientation="vertical" className="h-4 mx-1" />

                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={handleRotate}
                                                    >
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Rotate</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={handleReset}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Reset</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}

                                {/* File type badge for non-images */}
                                {(fileType !== 'image' || imageError) && (
                                    <Badge 
                                        variant={fileType === 'pdf' ? 'destructive' : 'outline'} 
                                        className="text-xs uppercase"
                                    >
                                        {fileType}
                                    </Badge>
                                )}
                            </div>

                            {/* Proof Display */}
                            <div className="relative flex-1 min-h-[300px] rounded-xl border bg-muted/10 overflow-hidden">
                                {renderProofContent()}
                            </div>

                            {/* Thumbnails */}
                            {proofs.length > 1 && (
                                <div className="mt-4">
                                    <ScrollArea className="w-full whitespace-nowrap">
                                        <div className="flex gap-2 pb-2">
                                            {proofs.map((proof, idx) => {
                                                const thumbType = getFileType(proof);
                                                const thumbUrl = getFullUrl(proof);
                                                
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setCurrentIndex(idx);
                                                            setZoom(1);
                                                            setRotation(0);
                                                        }}
                                                        className={cn(
                                                            "relative flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all",
                                                            idx === currentIndex 
                                                                ? "border-primary ring-2 ring-primary/20 shadow-sm" 
                                                                : "border-border/50 hover:border-primary/50 opacity-70 hover:opacity-100"
                                                        )}
                                                    >
                                                        {thumbType === 'image' ? (
                                                            <>
                                                                <img
                                                                    src={thumbUrl}
                                                                    alt={`Thumbnail ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        // Hide image and show fallback
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                        const fallback = target.nextElementSibling as HTMLElement;
                                                                        if (fallback) fallback.style.display = 'flex';
                                                                    }}
                                                                />
                                                                <div 
                                                                    className="w-full h-full items-center justify-center bg-muted hidden"
                                                                    style={{ display: 'none' }}
                                                                >
                                                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-muted">
                                                                <FileText className={cn(
                                                                    "h-5 w-5",
                                                                    thumbType === 'pdf' 
                                                                        ? "text-red-500" 
                                                                        : "text-muted-foreground"
                                                                )} />
                                                            </div>
                                                        )}
                                                        <span className="absolute bottom-0.5 right-0.5 text-[10px] font-medium bg-background/90 rounded px-1 shadow-sm">
                                                            {idx + 1}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <FileText className="h-10 w-10" />
                            </div>
                            <p className="text-sm font-medium">No proofs available</p>
                            <p className="text-xs mt-1">No documents have been uploaded for this imprest</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions - Only show for images (PDFs have their own buttons) */}
                {proofs.length > 0 && currentProof && fileType === 'image' && !imageError && (
                    <div className="p-6 pt-4 border-t bg-muted/10">
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => window.open(fullUrl, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in New Tab
                            </Button>
                            <Button 
                                variant="default" 
                                className="flex-1"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = fullUrl;
                                    link.download = fileName;
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

/* ================================
   MAIN COMPONENT
================================ */
export default function ProjectDashboardPage() {
    const form = useForm<{ projectId: number | null }>({
        defaultValues: { projectId: 277 },
    });

    const projectId = form.watch("projectId");
    const navigate = useNavigate();
    
    // Grid APIs for search
    const [poGridApi, setPoGridApi] = useState<GridApi | null>(null);
    const [woGridApi, setWoGridApi] = useState<GridApi | null>(null);
    const [imprestGridApi, setImprestGridApi] = useState<GridApi | null>(null);
    
    // Search states
    const [imprestSearch, setImprestSearch] = useState("");
    
    // Proof viewer state
    const [proofViewerOpen, setProofViewerOpen] = useState(false);
    const [selectedProofs, setSelectedProofs] = useState<string[]>([]);
    const [selectedImprestInfo, setSelectedImprestInfo] = useState<{
        employee: string;
        amount: number;
        category: string;
        partyName?: string;
        remark?: string;
    } | null>(null);

    const { data: projects = [] } = useProjectsMaster();
    const { data: projectDetails, isLoading } = useProjectDashboardDetails(projectId);

    const woBasicDetail = projectDetails?.woBasicDetail ?? {};
    const imprests = projectDetails?.imprests ?? [];
    const purchaseOrders = projectDetails?.purchaseOrders ?? [];

    // Handle view proofs
    const handleViewProofs = useCallback((imprest: any) => {
        setSelectedProofs(imprest.proof || []);
        setSelectedImprestInfo({
            employee: imprest.userName,
            amount: imprest.amount,
            category: imprest.category,
            partyName: imprest.partyName,
            remark: imprest.remark,
        });
        setProofViewerOpen(true);
    }, []);

    /* -------------------- PO COLUMNS -------------------- */
    const poActions: ActionItem<any>[] = [
        {
            label: "Raise Payment",
            onClick: (row) => console.log("Raise payment for", row.id),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.viewPoPage(row.id)),
        },
        {
            label: "Download PO",
            icon: <Download className="h-4 w-4" />,
            onClick: (row) => console.log("Download PO", row.id),
        },
    ];

    const poColumns = useMemo(() => [
        {
            field: "poNumber",
            headerName: "PO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "createdAt",
            headerName: "Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "sellerName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            cellRenderer: (p: any) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px]">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums",
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(poActions),
            width: 80,
            pinned: "right",
        },
    ], [navigate]);

    /* -------------------- WO COLUMNS -------------------- */
    const woActions: ActionItem<any>[] = [
        {
            label: "WO Acceptance",
            onClick: (row) => console.log("Accept WO", row),
        },
        {
            label: "WO Update",
            onClick: (row) => console.log("Update WO", row),
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => console.log("View WO", row),
        },
    ];

    const woData = useMemo(() => {
        if (!woBasicDetail.number) return [];
        return [woBasicDetail];
    }, [woBasicDetail]);

    const woColumns = useMemo(() => [
        {
            field: "number",
            headerName: "WO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "parGst",
            headerName: "WO Value",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "ldStartDate",
            headerName: "LD Start Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "maxLdDate",
            headerName: "Max LD Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "pbgApplicable",
            headerName: "PBG",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            field: "contractAgreement",
            headerName: "Contract",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(woActions),
            width: 80,
            pinned: "right",
        },
    ], []);

    /* -------------------- IMPREST COLUMNS -------------------- */
    const imprestColumns = useMemo(() => [
        {
            field: "userName",
            headerName: "Employee",
            sortable: true,
            filter: true,
            minWidth: 130,
            cellRenderer: (p: any) => (
                <span className="font-medium truncate block">{p.value || "-"}</span>
            ),
        },
        {
            field: "partyName",
            headerName: "Party",
            sortable: true,
            filter: true,
            minWidth: 140,
            cellRenderer: (p: any) => {
                const value = p.value;
                if (!value) return <span className="text-muted-foreground">-</span>;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block max-w-[130px]">{value}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">{value}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            width: 120,
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums font-semibold",
        },
        {
            field: "category",
            headerName: "Category",
            sortable: true,
            filter: true,
            width: 120,
            cellRenderer: (p: any) => (
                <Badge variant="outline" className="text-xs font-normal">
                    {p.value || "-"}
                </Badge>
            ),
        },
        {
            field: "remark",
            headerName: "Remark",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            cellRenderer: (p: any) => {
                const value = p.value;
                if (!value) return <span className="text-muted-foreground">-</span>;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block max-w-[180px] text-muted-foreground">
                                    {value}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                {value}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: any) => (
                <Badge variant={getStatusVariant(p.value)} className="text-xs">
                    {getStatusLabel(p.value)}
                </Badge>
            ),
        },
        {
            field: "approvalDate",
            headerName: "Approved",
            sortable: true,
            filter: true,
            width: 110,
            valueFormatter: (p: any) => formatDate(p.value),
            cellClass: "text-muted-foreground text-sm",
        },
        {
            field: "proof",
            headerName: "Proof",
            sortable: false,
            filter: false,
            width: 90,
            cellRenderer: (p: any) => {
                const proofs = p.value || [];
                if (proofs.length === 0) {
                    return <span className="text-muted-foreground text-xs">—</span>;
                }
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1"
                        onClick={() => handleViewProofs(p.data)}
                    >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{proofs.length}</span>
                    </Button>
                );
            },
        },
    ], [handleViewProofs]);

    /* -------------------- RENDER -------------------- */
    if (isLoading && !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Project Dashboard
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage and monitor your project details
                            </p>
                        </div>
                    </div>

                    {/* Project Selection */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <FormProvider {...form}>
                                        <SelectField
                                            control={form.control}
                                            name="projectId"
                                            label="Select Project"
                                            placeholder="-- Select Project --"
                                            options={projects.map((p: any) => ({
                                                id: String(p.id),
                                                name: p.projectName,
                                            }))}
                                        />
                                    </FormProvider>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {projectId && isLoading && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                    <p className="text-sm text-muted-foreground">
                                        Loading project details...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {projectId && projectDetails && (
                        <>
                            {/* Project Overview Stats */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Project Overview
                                        </CardTitle>
                                        <CardDescription>
                                            Financial summary and key metrics
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => navigate(paths.operations.raisePoForm)}
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" /> 
                                            Raise PO
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Plus className="mr-1.5 h-4 w-4" /> 
                                            Raise WO
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatCard
                                            label="WO Value (Pre GST)"
                                            value={woBasicDetail.parGst 
                                                ? formatCurrency(Number(woBasicDetail.parGst)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="WO Value (GST)"
                                            value={woBasicDetail.parAmt 
                                                ? formatCurrency(Number(woBasicDetail.parAmt)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Total Budget"
                                            value={woBasicDetail.budget 
                                                ? formatCurrency(Number(woBasicDetail.budget)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Expenses Done"
                                            value={woBasicDetail.expenses_done 
                                                ? formatCurrency(Number(woBasicDetail.expenses_done)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="PO Raised"
                                            value={woBasicDetail.poRaised 
                                                ? formatCurrency(Number(woBasicDetail.poRaised)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="WO Raised"
                                            value={woBasicDetail.woRaised 
                                                ? formatCurrency(Number(woBasicDetail.woRaised)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Planned GP"
                                            value="-"
                                        />
                                        <StatCard
                                            label="Actual GP"
                                            value="-"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Purchase Orders Table */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Purchase Orders
                                        </CardTitle>
                                        <CardDescription>
                                            {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''} found
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <DataTable
                                        data={purchaseOrders}
                                        columnDefs={poColumns}
                                        onGridReady={(params) => setPoGridApi(params.api)}
                                        gridOptions={{
                                            pagination: true,
                                            paginationPageSize: 5,
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            {/* Work Orders Table */}
                            <Card>
                                <CardHeader className="pb-4">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Work Orders
                                        </CardTitle>
                                        <CardDescription>
                                            {woData.length} order{woData.length !== 1 ? 's' : ''} found
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <DataTable
                                        data={woData}
                                        columnDefs={woColumns}
                                        onGridReady={(params) => setWoGridApi(params.api)}
                                        gridOptions={{
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            {/* Employee Imprests Table */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                Employee Imprests
                                            </CardTitle>
                                            <CardDescription>
                                                {imprests.length} record{imprests.length !== 1 ? 's' : ''} found
                                            </CardDescription>
                                        </div>
                                        {imprests.length > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                                <span className="text-xs text-muted-foreground">Total:</span>
                                                <span className="text-sm font-bold tabular-nums text-primary">
                                                    {formatCurrency(Number(projectDetails.imprestSum || 0))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search imprests..."
                                                value={imprestSearch}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setImprestSearch(value);
                                                    imprestGridApi?.setGridOption("quickFilterText", value);
                                                }}
                                                className="pl-9 w-64 h-9"
                                            />
                                            {imprestSearch && (
                                                <button
                                                    onClick={() => {
                                                        setImprestSearch("");
                                                        imprestGridApi?.setGridOption("quickFilterText", "");
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <DataTable
                                        data={imprests}
                                        columnDefs={imprestColumns}
                                        onGridReady={(params) => {
                                            setImprestGridApi(params.api);
                                            params.api.setGridOption("quickFilterText", imprestSearch);
                                        }}
                                        gridOptions={{
                                            pagination: true,
                                            paginationPageSize: 10,
                                            paginationPageSizeSelector: [5, 10, 20, 50],
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Empty State */}
                    {!projectId && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">No Project Selected</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-sm">
                                    Select a project from the dropdown above to view its dashboard and details.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Proof Viewer Sheet */}
                <ProofViewer
                    isOpen={proofViewerOpen}
                    onClose={() => setProofViewerOpen(false)}
                    proofs={selectedProofs}
                    imprestInfo={selectedImprestInfo || undefined}
                />
            </div>
        </TooltipProvider>
    );
}