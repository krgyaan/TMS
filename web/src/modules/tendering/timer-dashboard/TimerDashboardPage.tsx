import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStopTimer, useTimerDashboardSearch } from '@/hooks/api/useTimerDashboard';
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Clock, Search, Square } from 'lucide-react';
import { Fragment, useState } from 'react';

const stageNameMap: Record<string, string> = {
    tender_info_sheet: 'Tender Info Sheet',
    tender_approval: 'Tender Approval',
    rfq_sent: 'RFQ Sent',
    rfq_dashboard: 'RFQ Dashboard',
    emd_requested: 'EMD Requested',
    physical_docs: 'Physical Docs',
    document_checklist: 'Document Checklist',
    costing_sheets: 'Costing Sheets',
    costing_approval: 'Costing Approval',
    bid_submission: 'Bid Submission',
    tq_replied: 'TQ Replied',
    ra_approved: 'RA Approved',
    tender_result: 'Tender Result',
};

const TimerDashboard = () => {
    const [searchBy, setSearchBy] = useState('id');
    const [searchValue, setSearchValue] = useState('');
    const [submittedBy, setSubmittedBy] = useState<string | null>(null);
    const [submittedValue, setSubmittedValue] = useState<string | null>(null);
    const [expandedTimers, setExpandedTimers] = useState<Set<number>>(new Set());

    const { data, isLoading, isError, error } = useTimerDashboardSearch(submittedBy, submittedValue);
    const stopTimer = useStopTimer();

    const handleSearch = () => {
        if (!searchValue.trim()) return;
        setSubmittedBy(searchBy);
        setSubmittedValue(searchValue.trim());
        setExpandedTimers(new Set());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const toggleExpand = (id: number) => {
        setExpandedTimers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const formatDate = (d: Date | string | null | undefined) => {
        if (!d) return '—';
        return new Date(d).toLocaleString();
    };

    const formatDuration = (ms: number | null | undefined) => {
        if (ms == null) return '—';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        const variants: Record<string, { variant: 'success' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
            running: { variant: 'outline', icon: <Clock className="w-3 h-3 mr-1" /> },
            paused: { variant: 'secondary', icon: <Clock className="w-3 h-3 mr-1" /> },
            completed: { variant: 'success', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
            overdue: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
            stopped: { variant: 'secondary', icon: <Square className="w-3 h-3 mr-1" /> },
            not_started: { variant: 'outline', icon: null },
        };
        const v = variants[s] ?? { variant: 'default' as const, icon: null };
        return (
            <Badge variant={v.variant} className="font-mono">
                {v.icon}
                {status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    const getEventStatusBadge = (status: string | null) => {
        if (!status) return <span className="text-muted-foreground">—</span>;
        return getStatusBadge(status);
    };

    const formatTimeTaken = (ms: number | null | undefined) => {
        if (ms == null) return '—';
        return formatDuration(ms);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Timer Dashboard
                    </CardTitle>
                    <CardDescription>
                        Search for a tender to view and manage its timers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search-by">Search By</Label>
                            <Select value={searchBy} onValueChange={setSearchBy}>
                                <SelectTrigger id="search-by" className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="id">Tender ID</SelectItem>
                                    <SelectItem value="tender_no">Tender No</SelectItem>
                                    <SelectItem value="tender_name">Tender Name</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="search-value">Search Value</Label>
                            <Input
                                id="search-value"
                                placeholder={
                                    searchBy === 'id' ? 'Enter tender ID...'
                                    : searchBy === 'tender_no' ? 'Enter tender number...'
                                    : 'Enter tender name...'
                                }
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={!searchValue.trim()}>
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            <Skeleton className="h-6 w-96" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {isError && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5" />
                            <span>{(error as any)?.response?.data?.message || (error as Error).message}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {data?.results.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground text-sm">No tenders found matching your search.</p>
                    </CardContent>
                </Card>
            )}

            {data?.results.map((result: any) => (
                <div key={result.tender.id} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {result.tender.tenderName}
                            </CardTitle>
                            <CardDescription>
                                Tender #{result.tender.tenderNo} &middot; ID: {result.tender.id}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Timers</CardTitle>
                            <CardDescription>
                                {result.timers.length} timer{result.timers.length !== 1 ? 's' : ''} found
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {result.timers.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No timers found for this tender.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2 px-3 font-medium w-8" />
                                                <th className="py-2 px-3 font-medium">Stage</th>
                                                <th className="py-2 px-3 font-medium">Status</th>
                                                <th className="py-2 px-3 font-medium">Type</th>
                                                <th className="py-2 px-3 font-medium">Remaining</th>
                                                <th className="py-2 px-3 font-medium">Deadline</th>
                                                <th className="py-2 px-3 font-medium">Allocated</th>
                                                <th className="py-2 px-3 font-medium">Progress</th>
                                                <th className="py-2 px-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.timers.map((timer: any) => {
                                                const isExpanded = expandedTimers.has(timer.id);
                                                const events = timer.events || [];
                                                return (
                                                    <Fragment key={timer.id}>
                                                        <tr className="border-b hover:bg-muted/50">
                                                            <td className="py-2 px-3">
                                                                {events.length > 0 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 w-6 p-0"
                                                                        onClick={() => toggleExpand(timer.id)}
                                                                    >
                                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    </Button>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3 font-medium">
                                                                {stageNameMap[timer.stage] || timer.stage}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                {getStatusBadge(timer.status)}
                                                            </td>
                                                            <td className="py-2 px-3 text-muted-foreground">
                                                                {timer.timerType?.replace(/_/g, ' ')}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <TenderTimerDisplay
                                                                    remainingSeconds={Math.floor(timer.remainingTimeMs / 1000)}
                                                                    status={timer.status}
                                                                    deadline={timer.deadlineAt ? new Date(timer.deadlineAt) : null}
                                                                />
                                                            </td>
                                                            <td className="py-2 px-3 text-muted-foreground">
                                                                {formatDate(timer.deadlineAt)}
                                                            </td>
                                                            <td className="py-2 px-3 font-mono text-muted-foreground">
                                                                {formatDuration(timer.allocatedTimeMs)}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${timer.isOverdue ? 'bg-destructive' : timer.isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                            style={{ width: `${Math.min(timer.progressPercent, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                                                                        {Math.round(timer.progressPercent)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                {timer.status?.toLowerCase() === 'running' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => stopTimer.mutate({
                                                                            entityType: timer.entityType,
                                                                            entityId: timer.entityId,
                                                                            stage: timer.stage,
                                                                        })}
                                                                        disabled={stopTimer.isPending}
                                                                    >
                                                                        <Square className="w-3 h-3 mr-1" />
                                                                        Stop
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && events.length > 0 && events.map((ev: any, evIdx: number) => {
                                                            const startedAt = new Date(ev.createdAt).getTime();
                                                            const endedAt = evIdx < events.length - 1
                                                                ? new Date(events[evIdx + 1].createdAt).getTime()
                                                                : timer.endedAt ? new Date(timer.endedAt).getTime() : null;
                                                            const timeTakenMs = evIdx > 0
                                                                ? startedAt - new Date(events[evIdx - 1].createdAt).getTime()
                                                                : null;
                                                            return (
                                                                <tr key={`${timer.id}-event-${evIdx}`} className="bg-muted/30 border-b">
                                                                    <td />
                                                                    <td className="py-1.5 px-3 text-xs text-muted-foreground">
                                                                        {stageNameMap[timer.stage] || timer.stage}
                                                                    </td>
                                                                    <td className="py-1.5 px-3">
                                                                        {getEventStatusBadge(ev.eventType)}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs font-mono text-muted-foreground">
                                                                        {formatDuration(timer.allocatedTimeMs)}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                        {formatDate(ev.createdAt)}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                        {endedAt ? formatDate(new Date(endedAt)) : '—'}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs font-mono text-muted-foreground">
                                                                        {formatTimeTaken(timeTakenMs)}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs text-muted-foreground truncate max-w-[120px]" title={ev.performedByName || ''}>
                                                                        {ev.performedByName || '—'}
                                                                    </td>
                                                                    <td className="py-1.5 px-3 text-xs text-muted-foreground truncate max-w-[150px]" title={ev.reason || ''}>
                                                                        {ev.reason || '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    );
};

export default TimerDashboard;
