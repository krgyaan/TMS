import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { HappyCallingRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';

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
    record: HappyCallingRow | null;
};

export function HappyCallingViewModal({ open, onOpenChange, record }: Props) {
    if (!record) return null;

    const formatOrDash = (value?: string | null) => (value && value.trim().length > 0 ? value : '—');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>{record.name}</DialogTitle>
                    <DialogDescription>Happy calling details</DialogDescription>
                </DialogHeader>
                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <div className="divide-y">
                        <Row label="Organization">{formatOrDash(record.organization)}</Row>
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
                        <Row label="Date">{formatDateTime(record.date ?? null)}</Row>
                        <Row label="Next Follow Up Date">{formatDateTime(record.nextFollowupDate ?? null)}</Row>
                        <Row label="Status">
                            {record.status ? (
                                <Badge variant={record.status === 'done' ? 'default' : 'secondary'}>
                                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </Badge>
                            ) : (
                                '—'
                            )}
                        </Row>
                        <Row label="Broadcast">{record.broadcast || '—'}</Row>
                        <Row label="Created At">{formatDateTime(record.createdAt ?? null)}</Row>
                        <Row label="Updated At">{formatDateTime(record.updatedAt ?? null)}</Row>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default HappyCallingViewModal;