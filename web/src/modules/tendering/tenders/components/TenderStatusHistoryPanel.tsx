import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Clock, History, User } from 'lucide-react';
import { useTenderStatusHistory } from '@/hooks/api/useTenders';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { cn } from '@/lib/utils';

interface TenderStatusHistoryPanelProps {
    tenderId: number | null;
    className?: string;
}

export function TenderStatusHistoryPanel({ tenderId, className = '' }: TenderStatusHistoryPanelProps) {
    const { data = [], isLoading, isError } = useTenderStatusHistory(tenderId);

    return (
        <Card className={cn('py-4', className)}>
            <CardHeader className="pb-3 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <History className="h-3.5 w-3.5" />
                    Status History
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
                {isLoading && (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && isError && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Failed to load status history.
                    </p>
                )}

                {!isLoading && !isError && data.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No status changes yet.
                    </p>
                )}

                {!isLoading && !isError && data.length > 0 && (
                    <div className="space-y-1">
                        {data.map((entry, idx) => (
                            <div key={entry.id} className="flex gap-2">
                                <div className="flex flex-col items-center">
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    {idx < data.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-border mt-1" />
                                    )}
                                </div>
                                <div className="flex-1 pb-3 min-w-0">
                                    <div className="flex items-center gap-1 min-w-0">
                                        {entry.prevStatusName && (
                                            <>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-normal px-1.5 py-0 rounded-md shrink min-w-0 max-w-[40%]"
                                                >
                                                    <span className="block truncate" title={entry.prevStatusName}>
                                                        {entry.prevStatusName}
                                                    </span>
                                                </Badge>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                            </>
                                        )}
                                        <Badge className="text-[10px] font-normal px-1.5 py-0 rounded-md shrink min-w-0 flex-1">
                                            <span
                                                className="block truncate"
                                                title={entry.newStatusName || `Status #${entry.newStatus}`}
                                            >
                                                {entry.newStatusName || `Status #${entry.newStatus}`}
                                            </span>
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 mt-0.5">
                                        {entry.changedByName && (
                                            <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1 min-w-0">
                                                <User className="h-3 w-3 shrink-0" />
                                                {entry.changedByName}
                                                {entry.changedByUsername ? ` (${entry.changedByUsername})` : ''}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                            {formatDateTime(entry.createdAt)}
                                        </span>
                                    </div>

                                    {entry.comment && (
                                        <p className="text-[11px] text-muted-foreground mt-1 break-words">
                                            {entry.comment}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default TenderStatusHistoryPanel;
