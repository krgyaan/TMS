import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { ClientDirectoryRow } from '@/modules/shared/client-directory/helpers/client-directory.types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b last:border-b-0">
            <span className="w-full sm:w-48 shrink-0 font-medium text-muted-foreground text-sm">{label}</span>
            <span className="text-sm text-foreground">{children}</span>
        </div>
    );
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ClientDirectoryRow | null;
};

export function ClientDirectoryViewModal({ open, onOpenChange, record }: Props) {
    if (!record) return null;

    const formatOrDash = (value?: string | null) => (value && value.trim().length > 0 ? value : '—');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>{record.name}</DialogTitle>
                    <DialogDescription>Client contact details</DialogDescription>
                </DialogHeader>
                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <div className="divide-y">
                        <Row label="Name">{record.name}</Row>
                        <Row label="Designation">{formatOrDash(record.designation)}</Row>
                        <Row label="Email">
                            {record.email ? (
                                <a href={`mailto:${record.email}`} className="text-primary hover:underline">
                                    {record.email}
                                </a>
                            ) : (
                                '—'
                            )}
                        </Row>
                        <Row label="Phone">{formatOrDash(record.phone)}</Row>
                        <Row label="Organization">{formatOrDash(record.organization)}</Row>
                        <Row label="Gifting Tier">
                            {record.giftingTier ? (
                                <Badge variant="secondary">{record.giftingTier}</Badge>
                            ) : (
                                '—'
                            )}
                        </Row>
                        <Row label="Address (Personal)">{formatOrDash(record.address?.personal)}</Row>
                        <Row label="Address (Official)">{formatOrDash(record.address?.official)}</Row>
                        <Row label="Remarks">
                            {record.remarks && record.remarks.length > 0 ? (
                                <div className="space-y-3">
                                    {record.remarks.map((remark, index) => (
                                        <div key={index} className="rounded-md border bg-muted/40 p-3">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{remark.text}</p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {remark.by} · {formatDateTime(remark.at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                '—'
                            )}
                        </Row>
                        <Row label="Created At">{formatDateTime(record.createdAt ?? null)}</Row>
                        <Row label="Updated At">{formatDateTime(record.updatedAt ?? null)}</Row>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default ClientDirectoryViewModal;