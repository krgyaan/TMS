import { Card, CardContent, } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { User, FileText, CalendarClock } from 'lucide-react';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useBroadcasts } from '@/hooks/api/useHappyCalling';
import type { HappyCallingRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';

interface Props {
    record: HappyCallingRow;
}

export function HappyCallingView({ record }: Props) {
    const { data: broadcasts = [] } = useBroadcasts();
    const broadcastName = broadcasts.find((b) => b.id === record.broadcast)?.name;

    const formatOrDash = (value?: string | null) => (value && value.trim().length > 0 ? value : '—');

    return (
        <Card>
            
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <FileText className="h-4 w-4 inline mr-2" /> Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Organization
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {formatOrDash(record.organization)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Name
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {record.name || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Designation
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatOrDash(record.designation)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Email
                            </TableCell>
                            <TableCell className="text-sm">
                                {record.email ? (
                                    <a href={`mailto:${record.email}`} className="text-primary hover:underline">
                                        {record.email}
                                    </a>
                                ) : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Phone
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatOrDash(record.phone)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {record.status ? (
                                    <Badge variant={record.status === 'done' ? 'default' : 'secondary'}>
                                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </Badge>
                                ) : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Broadcast
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {broadcastName || record.broadcast || '—'}
                            </TableCell>
                        </TableRow>
                        {record.details && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Details
                                </TableCell>
                                <TableCell className="text-sm break-words" colSpan={3}>
                                    {record.details}
                                </TableCell>
                            </TableRow>
                        )}

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <CalendarClock className="h-4 w-4 inline mr-2" /> Follow Up Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Next Follow Up Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(record.nextFollowupDate ?? null)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Follow Up Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(record.lastFollowupDate ?? null)}
                            </TableCell>
                        </TableRow>

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <User className="h-4 w-4 inline mr-2" /> Audit Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created By
                            </TableCell>
                            <TableCell className="text-sm">
                                {record.createdByName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(record.createdAt ?? null)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Updated At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(record.updatedAt ?? null)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground" />
                            <TableCell className="text-sm" />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default HappyCallingView;
