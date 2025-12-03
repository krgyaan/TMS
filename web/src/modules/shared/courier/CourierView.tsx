// src/modules/shared/courier/show.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Building,
    User,
    MapPin,
    Phone,
    FileText,
    Package,
    CheckCircle,
    ExternalLink,
    Loader2,
    AlertCircle,
    CalendarDays,
    Hash,
    Mail,
    Download,
    Eye,
    Copy,
    Truck,
    Pencil,
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCourier } from "@/hooks/api/useCouriers";

// Modern styling constants
const MODERN_STYLES = {
    gradient: "bg-gradient-to-b from-background via-background to-muted/10",
    cardShadow: "shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-shadow duration-300",
    border: "border-border/20 hover:border-border/40 transition-colors",
    accent: "text-primary",
};

// Helpers
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// Modern Information Row Component
interface InfoRowProps {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    isImportant?: boolean;
    copyable?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value, isImportant = false, copyable = false }) => {
    const handleCopy = () => {
        if (typeof value === "string") {
            navigator.clipboard.writeText(value);
        }
    };

    return (
        <div className="py-4 px-5 border-b border-muted/20 last:border-0 hover:bg-muted/5 transition-colors rounded-lg group">
            <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${isImportant ? "bg-primary/15" : "bg-muted/20"} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`h-5 w-5 ${isImportant ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${isImportant ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                        {copyable && value && typeof value === "string" && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
                                <Copy className="h-3 w-3" />
                            </Button>
                        )}
                    </div>

                    <div className="text-base font-medium leading-relaxed break-words">{value || <span className="text-muted-foreground italic">Not specified</span>}</div>
                </div>
            </div>
        </div>
    );
};

// Modern Document Card Component
const DocumentCard: React.FC<{
    url: string | null;
    title: string;
    description: string;
    icon: React.ElementType;
    variant?: "primary" | "secondary";
}> = ({ url, title, description, icon: Icon, variant = "secondary" }) => {
    if (!url) {
        return (
            <div className="p-5 rounded-xl border-2 border-dashed border-muted/40 bg-muted/5 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted/20">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-muted-foreground">{title}</h4>
                    <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-muted/30 text-xs text-muted-foreground">
                        <span>Not available</span>
                    </div>
                </div>
            </div>
        );
    }

    const isPrimary = variant === "primary";

    return (
        <div className={`p-5 rounded-xl border ${isPrimary ? "border-primary/30 bg-primary/5" : "border-border/20 bg-card"} hover:shadow-md transition-all duration-200 group`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${isPrimary ? "bg-primary/15" : "bg-muted/20"} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h4 className="font-semibold">{title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{description}</p>
                        </div>
                        <div className="flex gap-1.5">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    // Download functionality
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = title.toLowerCase().replace(/\s+/g, "-");
                                    link.click();
                                }}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                isPrimary ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/20"
                            } transition-colors`}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open document
                        </a>
                        <span className="text-xs text-muted-foreground/70">{isPrimary ? "Required" : "Supporting"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Page -------------------------------------------------
const CourierViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id) : 0;

    const { data: courier, isLoading, isError, error } = useCourier(courierId);

    // Loading State -----------------------------------------
    if (isLoading) {
        return (
            <div className={`min-h-screen ${MODERN_STYLES.gradient} flex items-center justify-center p-6`}>
                <div className="text-center space-y-6 max-w-md">
                    <div className="relative mx-auto w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-primary/20 animate-spin"></div>
                        <Truck className="h-10 w-10 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xl font-semibold tracking-tight">Loading Shipment Details</h3>
                        <p className="text-muted-foreground">Preparing your courier information...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error State -------------------------------------------
    if (isError || !courier) {
        return (
            <div className={`min-h-screen ${MODERN_STYLES.gradient} flex items-center justify-center p-6`}>
                <Card className={`${MODERN_STYLES.cardShadow} max-w-md`}>
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="space-y-3">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold tracking-tight">Shipment Not Found</h3>
                                <p className="text-muted-foreground mt-2">{(error as any)?.response?.data?.message || "Unable to locate this courier shipment"}</p>
                            </div>
                        </div>
                        <Button onClick={() => navigate(paths.shared.couriers)} className="gap-2 w-full">
                            <ArrowLeft className="h-4 w-4" />
                            Return to Couriers
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const documents = courier.courier_docs || [];

    return (
        <div className={`min-h-screen ${MODERN_STYLES.gradient} py-8 px-4 sm:px-6`}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex justify-between center w-full">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(paths.shared.couriers)}
                                className="rounded-full hover:bg-primary/5 hover:scale-105 transition-all"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            <div>
                                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                    Courier Details
                                </h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        Created: {formatDate(courier.created_at)}
                                    </span>
                                    <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">ID: #{courier.id || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate(paths.shared.courierEdit(courier.id))}
                            className="flex items-center gap-2 rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Button>
                    </div>

                    <Separator className="my-4" />
                </div>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Recipient Information */}
                    <div className="space-y-6">
                        <Card className={`${MODERN_STYLES.cardShadow} ${MODERN_STYLES.border} h-full`}>
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-primary/10">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Recipient Information</CardTitle>
                                            <CardDescription>Shipment destination details</CardDescription>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building className="h-3.5 w-3.5" />
                                        Destination
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-6">
                                <div className="space-y-1">
                                    <InfoRow icon={Building} label="Organization / Company" value={courier.to_org || "Not specified"} isImportant copyable />

                                    <InfoRow icon={User} label="Contact Person" value={courier.to_name} copyable />

                                    <InfoRow
                                        icon={MapPin}
                                        label="Delivery Address"
                                        value={
                                            <div className="space-y-2">
                                                <div>{courier.to_addr || "Address not provided"}</div>
                                                {courier.to_pin && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 w-fit">
                                                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-mono font-medium">{courier.to_pin}</span>
                                                    </div>
                                                )}
                                            </div>
                                        }
                                        isImportant
                                    />

                                    <InfoRow
                                        icon={Phone}
                                        label="Contact Number"
                                        value={
                                            courier.to_mobile ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                                                        <Phone className="h-4 w-4 text-primary" />
                                                        <span className="font-mono font-semibold text-base">{courier.to_mobile}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(`tel:${courier.to_mobile}`, "_blank")}>
                                                        <Phone className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                "Not provided"
                                            )
                                        }
                                        copyable
                                    />

                                    <InfoRow
                                        icon={Mail}
                                        label="Additional Notes"
                                        value={<div className="text-sm text-muted-foreground italic">{courier.notes || "No additional notes provided"}</div>}
                                    />
                                </div>

                                {/* Contact Actions */}
                                {courier.to_mobile && (
                                    <div className="mt-8 pt-6 border-t border-muted/20">
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`tel:${courier.to_mobile}`, "_blank")}>
                                                <Phone className="h-4 w-4" />
                                                Call Recipient
                                            </Button>
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`sms:${courier.to_mobile}`, "_blank")}>
                                                <Mail className="h-4 w-4" />
                                                Send SMS
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Document Proof */}
                    <div className="space-y-6">
                        <Card className={`${MODERN_STYLES.cardShadow} ${MODERN_STYLES.border} h-full`}>
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                                            <FileText className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Document Proof</CardTitle>
                                            <CardDescription>Shipping documents and proofs</CardDescription>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        {documents.length + (courier.docket_slip ? 1 : 0) + (courier.delivery_pod ? 1 : 0)} files
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Essential Documents */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Essential Documents</h3>
                                        <div className="space-y-4">
                                            <DocumentCard
                                                url={courier.docket_slip}
                                                title="Docket Slip"
                                                description="Official shipping documentation with tracking details"
                                                icon={Package}
                                                variant="primary"
                                            />

                                            <DocumentCard
                                                url={courier.delivery_pod}
                                                title="Proof of Delivery"
                                                description="Signed confirmation of successful delivery"
                                                icon={CheckCircle}
                                                variant="primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Supporting Documents */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Supporting Documents</h3>
                                        {documents.length > 0 ? (
                                            <div className="space-y-3">
                                                {documents.map((d, i) => (
                                                    <DocumentCard
                                                        key={i}
                                                        url={d.url}
                                                        title={`Supporting Document ${i + 1}`}
                                                        description="Additional shipping documentation"
                                                        icon={FileText}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 border-2 border-dashed border-muted/30 rounded-xl bg-muted/5">
                                                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                                                <p className="text-muted-foreground">No supporting documents attached</p>
                                                <p className="text-sm text-muted-foreground/70 mt-1">Upload supporting files if needed</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Document Summary */}
                                    <div className="pt-4 border-t border-muted/20">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Documents</span>
                                            <span className="font-semibold">{documents.length + (courier.docket_slip ? 1 : 0) + (courier.delivery_pod ? 1 : 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-2">
                                            <span className="text-muted-foreground">Essential Documents</span>
                                            <span className="font-semibold">{(courier.docket_slip ? 1 : 0) + (courier.delivery_pod ? 1 : 0)}/2</span>
                                        </div>
                                    </div>

                                    {/* Bulk Actions */}
                                    {(documents.length > 0 || courier.docket_slip || courier.delivery_pod) && (
                                        <div className="mt-6 pt-4 border-t border-muted/20">
                                            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Bulk Actions</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        // Export all documents logic
                                                        const allUrls = [courier.docket_slip, courier.delivery_pod, ...documents.map(d => d.url)].filter(Boolean);

                                                        // Implementation for downloading all documents
                                                        console.log("Exporting all documents:", allUrls);
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Export All
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        // Print all documents logic
                                                        window.print();
                                                    }}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Print Summary
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Back Button */}
                <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={() => navigate(paths.shared.couriers)} className="gap-2 px-8">
                        <ArrowLeft className="h-4 w-4" />
                        Back to All Couriers
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CourierViewPage;
