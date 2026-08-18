import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useBroadcasts } from '@/hooks/api/useHappyCalling';
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
    record: HappyCallingRow;
};

export function HappyCallingView({ record }: Props) {
    const { data: broadcasts = [] } = useBroadcasts();
    const broadcastName = broadcasts.find((b) => b.id === record.broadcast)?.name;

    const formatOrDash = (value?: string | null) => (value && value.trim().length > 0 ? value : '—');

    return (
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
            <Row label="Broadcast">{broadcastName || record.broadcast || '—'}</Row>
            <Row label="Details">{formatOrDash(record.details)}</Row>
            <Row label="Created At">{formatDateTime(record.createdAt ?? null)}</Row>
            <Row label="Updated At">{formatDateTime(record.updatedAt ?? null)}</Row>
        </div>
    );
}

export default HappyCallingView;
