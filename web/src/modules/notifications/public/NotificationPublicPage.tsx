import { useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { Loader2, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePublicNotification } from "@/hooks/api/usePublicNotification";
import {
    type ApprovalStatus,
    type PublicNotificationResponse,
    type PublicOrderEntity,
    type PublicPaymentRequestEntity,
    type PublicVendorWorkOrderEntity,
} from "@/services/api";
import { PAYMENT_AGAINST_LABELS, STATUS_CONFIG } from "@/modules/operations/payment-requests/constants";

const BRAND_LOGO = "https://volksenergie.in/wp-content/uploads/2024/09/VE_Logo-Final-Black_BG_Artboard-1.png";

const TYPE_LABELS: Record<string, string> = {
    pr: "Payment Request",
    po: "Purchase Order",
    vwo: "Vendor Work Order",
};

const APPROVAL_CHIP: Record<ApprovalStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
    approved: { label: "Approved", color: "text-green-600 bg-green-50" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};

const formatAmount = (value: string | null | undefined): string => (value != null && value !== "" ? formatINR(value) : "—");

const formatDate = (value: string | null | undefined): string =>
    value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function NotificationPublicPage() {
    const { token } = useParams<{ token: string }>();
    const { data, isLoading, isError, error } = usePublicNotification(token);

    let body: ReactNode;
    if (!token) {
        body = (
            <ProblemCard
                title="Invalid link"
                message="This link is missing notification information. Please open the link exactly as it was shared with you."
            />
        );
    } else if (isLoading) {
        body = (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    } else if (isError) {
        const expired = isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404);
        body = expired ? (
            <ProblemCard
                title="Link expired or invalid"
                message="This notification link is no longer valid. Please request an updated link from the TMS team."
            />
        ) : (
            <ProblemCard title="Something went wrong" message="We could not load this notification right now. Please try again later." />
        );
    } else if (data) {
        body = <NotificationCard data={data} />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* ── Brand Header ─────────────────────────────────────────── */}
            <header className="flex items-center justify-center bg-[linear-gradient(135deg,#110703,#3a322d)] px-4 py-4">
                <div className="w-full max-w-2xl">
                    <img src={BRAND_LOGO} alt="Volks Energie" className="h-10 sm:h-12 w-auto object-contain" />
                </div>
            </header>

            {/* ── Main ─────────────────────────────────────────────────── */}
            <main className="flex-1 w-full mx-auto max-w-xl px-4 py-6 sm:py-10">{body}</main>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="bg-[linear-gradient(90deg,#ff6a00,#ff9500)] text-white py-3 text-center">
                <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} Volks Energie. All Rights Reserved.</p>
            </footer>
        </div>
    );
}

function NotificationCard({ data }: { data: PublicNotificationResponse }) {
    const { type, event, entity } = data;
    const isPr = type === "pr";
    const pr = entity as PublicPaymentRequestEntity;
    const order = entity as PublicOrderEntity;
    const vwo = entity as PublicVendorWorkOrderEntity;

    const chip = isPr
        ? STATUS_CONFIG[pr.status] ?? { label: pr.status, color: "text-muted-foreground bg-muted" }
        : APPROVAL_CHIP[order.approvalStatus];

    const referenceLabel = isPr ? "Request No" : type === "po" ? "PO No" : "WO No";
    const actorLabel = isPr ? "Requested By" : "Raised By";

    return (
        <div className="space-y-4">
            {/* ── Event + status ─────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-block rounded-full bg-[linear-gradient(90deg,#ff6a00,#ff9500)] px-3 py-1 text-xs font-semibold text-white">
                    {event ?? TYPE_LABELS[type] ?? "Notification"}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{TYPE_LABELS[type] ?? "Notification"}</h1>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${chip.color}`}>{chip.label}</span>
            </div>

            {/* ── Details ────────────────────────────────────────────── */}
            <Card className="p-5 space-y-3">
                <DetailRow label={referenceLabel} value={entity.referenceNo} />
                <DetailRow label="Amount" value={formatAmount(isPr ? pr.amount : order.grandTotal)} />
                {!isPr && order.amountAfterTds && (
                    <DetailRow label={`After TDS (${order.tdsPercentage || "0"}%)`} value={formatAmount(order.amountAfterTds)} />
                )}
                <DetailRow label={isPr ? "Party" : "Seller"} value={isPr ? pr.partyName : order.sellerName} />
                {!isPr && <DetailRow label="Project" value={order.projectName} />}
                {isPr && pr.category && <DetailRow label="Category" value={PAYMENT_AGAINST_LABELS[pr.category] ?? pr.category} />}
                {!isPr && order.category && <DetailRow label="Category" value={PAYMENT_AGAINST_LABELS[order.category] ?? order.category} />}
                <DetailRow label={actorLabel} value={isPr ? pr.requestedByName : order.raisedByName} />
                {!isPr && order.orderDate && <DetailRow label={type === "po" ? "PO Date" : "WO Date"} value={order.orderDate} />}
                {isPr && pr.utrNumber && <DetailRow label="UTR" value={pr.utrNumber} />}
                {isPr && pr.rejectionReason && <DetailRow label="Rejection Reason" value={pr.rejectionReason} />}
                {isPr && pr.remark && <DetailRow label="Remark" value={pr.remark} />}
                {!isPr && order.approvalRemark && <DetailRow label="Approval Remark" value={order.approvalRemark} />}
                {!isPr && type === "vwo" && <DetailRow label="Scope of Work" value={vwo.scopeOfWork} />}
            </Card>

            {/* ── Timestamps ─────────────────────────────────────────── */}
            <Card className="p-5 space-y-3">
                <DetailRow label="Created" value={formatDate(entity.createdAt)} />
                <DetailRow label="Last Updated" value={formatDate(entity.updatedAt)} />
            </Card>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right break-words">{value || "—"}</span>
        </div>
    );
}

function ProblemCard({ title, message }: { title: string; message: string }) {
    return (
        <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
        </Card>
    );
}
