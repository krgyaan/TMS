import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useKickoffMeetingByWoId } from "@/hooks/api/useKickoffMeeting";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { AlertCircle, Calendar, FileText, Link2 } from "lucide-react";

interface KickOffSectionProps {
    woDetailId: number;
}

export function KickOffSection({ woDetailId }: KickOffSectionProps) {
    const { data, isLoading, error } = useKickoffMeetingByWoId(woDetailId);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load kick-off meeting details.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (!data) {
        return <p className="text-sm text-muted-foreground italic">No kick-off meeting scheduled.</p>;
    }

    return (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground w-1/4">Status</TableCell>
                    <TableCell>
                        <Badge variant={data.status === 'mom_uploaded' ? 'default' : 'secondary'} className="capitalize">
                            {data.status === 'mom_uploaded' ? 'MOM Uploaded' : 'Scheduled'}
                        </Badge>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Meeting Date</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {data.meetingDate ? formatDateTime(data.meetingDate) : '—'}
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Meeting Link</TableCell>
                    <TableCell>
                        {data.meetingLink ? (
                            <a href={data.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline">
                                <Link2 className="h-4 w-4" />
                                {data.meetingLink}
                            </a>
                        ) : (
                            <span className="text-muted-foreground italic">Not provided</span>
                        )}
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground">MOM Document</TableCell>
                    <TableCell>
                        {data.momFilePath ? (
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm">Uploaded {data.momUploadedAt ? formatDateTime(data.momUploadedAt) : ''}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground italic">Not uploaded</span>
                        )}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
