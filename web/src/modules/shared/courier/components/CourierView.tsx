import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/hooks/useFormatedDate";
import { fileUploadService } from "@/services/api/file-upload.service";
import {
    COURIER_STATUS_BADGE,
    COURIER_STATUS_LABELS,
} from "@/modules/shared/courier/helpers/courier.constants";
import type { CourierDetails } from "@/modules/shared/courier/helpers/courier.types";
import {
    Building,
    CalendarDays,
    CheckCircle2,
    FileText,
    Hash,
    MapPin,
    Package,
    Phone,
    Truck,
    User,
} from "lucide-react";

const URGENCY_LABELS: Record<number, string> = {
    1: "Same Day (Urgent)",
    2: "Next Day",
};

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/courier/${doc}`;

function SectionHeader({ title, icon: Icon }: { title: string; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-sm py-2">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {title}
                </div>
            </TableCell>
        </TableRow>
    );
}

function FieldRow({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">{label}</TableCell>
            <TableCell
                className={`text-sm ${fullWidth ? "col-span-3" : "w-3/4"} whitespace-normal [overflow-wrap:anywhere]`}
                colSpan={fullWidth ? 3 : undefined}
            >
                {value || "—"}
            </TableCell>
        </TableRow>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell colSpan={4} className="text-sm text-muted-foreground italic py-2">
                {message}
            </TableCell>
        </TableRow>
    );
}

function DocumentLink({ path }: { path: string }) {
    const url = docUrl(path);
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
        >
            <FileText className="h-4 w-4" />
            {path.split("/").pop() ?? path}
        </a>
    );
}

export function CourierView({ courier }: { courier: CourierDetails }) {
    const documents = courier.courierDocs ?? [];
    const requestedBy = courier.sender ?? courier.empFromUser ?? null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Courier Details
                    </CardTitle>
                    <Badge variant={COURIER_STATUS_BADGE[courier.status] ?? "outline"}>
                        {COURIER_STATUS_LABELS[courier.status] ?? `Status ${courier.status}`}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <SectionHeader title="Recipient Information" icon={User} />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Organization
                            </TableCell>
                            <TableCell className="text-sm w-1/4">{courier.toOrg || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Contact Person
                            </TableCell>
                            <TableCell className="text-sm">{courier.toName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5" /> Mobile
                                </span>
                            </TableCell>
                            <TableCell className="text-sm font-mono">{courier.toMobile || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5" /> Pin Code
                                </span>
                            </TableCell>
                            <TableCell className="text-sm font-mono">{courier.toPin || "—"}</TableCell>
                        </TableRow>
                        <FieldRow
                            label="Delivery Address"
                            value={
                                courier.toAddr ? (
                                    <span className="inline-flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        {courier.toAddr}
                                    </span>
                                ) : null
                            }
                            fullWidth
                        />

                        <SectionHeader title="Shipment / Dispatch" icon={Package} />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Courier Provider
                            </TableCell>
                            <TableCell className="text-sm w-1/4">{courier.courierProvider || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Docket No
                            </TableCell>
                            <TableCell className="text-sm font-mono">{courier.docketNo || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Pickup Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.pickupDate ? formatDateTime(courier.pickupDate) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tracking No
                            </TableCell>
                            <TableCell className="text-sm font-mono">{courier.trackingNumber || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expected Delivery
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.delDate ? formatDate(courier.delDate) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Urgency
                            </TableCell>
                            <TableCell className="text-sm">
                                {URGENCY_LABELS[courier.urgency] ?? courier.urgency ?? "—"}
                            </TableCell>
                        </TableRow>

                        <SectionHeader title="Delivery" icon={CheckCircle2} />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Delivery Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {courier.deliveryDate ? formatDateTime(courier.deliveryDate) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Within Expected Time
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.withinTime === true ? "Yes" : courier.withinTime === false ? "No" : "—"}
                            </TableCell>
                        </TableRow>

                        <SectionHeader title="Documents" icon={FileText} />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Docket Slip
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {courier.docketSlip ? <DocumentLink path={courier.docketSlip} /> : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Proof of Delivery
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.deliveryPod ? <DocumentLink path={courier.deliveryPod} /> : "—"}
                            </TableCell>
                        </TableRow>
                        {documents.length > 0 ? (
                            documents.map((doc, index) => (
                                <FieldRow
                                    key={`${doc}-${index}`}
                                    label={`Supporting Document ${index + 1}`}
                                    value={<DocumentLink path={doc} />}
                                    fullWidth
                                />
                            ))
                        ) : (
                            <EmptyState message="No supporting documents attached" />
                        )}

                        <SectionHeader title="Request / Audit" icon={Building} />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {requestedBy?.name || "—"}
                                {requestedBy?.email ? ` (${requestedBy.email})` : ""}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created By
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.createdByName || "—"}
                                {courier.createdByEmail ? ` (${courier.createdByEmail})` : ""}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5" /> Created At
                                </span>
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.createdAt ? formatDateTime(courier.createdAt) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Updated At
                            </TableCell>
                            <TableCell className="text-sm">
                                {courier.updatedAt ? formatDateTime(courier.updatedAt) : "—"}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default CourierView;
