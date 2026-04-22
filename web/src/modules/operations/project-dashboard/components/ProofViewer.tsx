import { Button } from "@/components/ui/button";
import { ScrollBar, ScrollArea } from "@/components/ui/scroll-area";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { AlertCircle, Badge, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import React from "react"
import {useState} from  "react";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/modules/performance/tender-executive/components/emd-helpers";
import { cn } from "@/lib/utils";



/* ================================
   ENHANCED PROOF VIEWER SHEET
================================ */
export interface ProofViewerProps {
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

export const ProofViewer: React.FC<ProofViewerProps> = ({ 
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
                <div className="absolute inset-0 overflow-auto p-4">
                    {/* Centering wrapper */}
                    <div className="flex items-center justify-center min-w-full min-h-full">
                        
                        {/* Loader */}
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            </div>
                        )}

                        {/* Image */}
                        <img
                            src={fullUrl}
                            alt={`Proof ${currentIndex + 1}`}
                            className={cn(
                                "transition-transform duration-200 object-contain",
                                imageLoading && "opacity-0"
                            )}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transformOrigin: "center center",
                            }}
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                const container = img.parentElement;

                                if (container) {
                                    const scaleX = container.clientWidth / img.naturalWidth;
                                    const scaleY = container.clientHeight / img.naturalHeight;

                                    // Fit image initially (like Google Drive)
                                    const fitScale = Math.min(scaleX, scaleY, 1);
                                    setZoom(fitScale);
                                }

                                setImageLoading(false);
                            }}
                            onError={() => {
                                console.error("Image failed:", fullUrl);
                                setImageError(true);
                                setImageLoading(false);
                            }}
                        />
                    </div>
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