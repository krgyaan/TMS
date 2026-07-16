import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStopTimer, useTimerDashboardSearch } from '@/hooks/api/useTimerDashboard';
import { AlertCircle, CheckCircle, Clock, Search, Square } from 'lucide-react';
import { useState } from 'react';

const stageNameMap: Record<string, string> = {
    tender_info_sheet: 'Tender Info Sheet',
    tender_approval: 'Tender Approval',
    rfq_sent: 'RFQ',
    rfq_response: 'RFQ Response',
    physical_docs: 'Physical Docs',
    emd_requested: 'EMD Request',
    emd_submission: 'EMD Submission',
    document_checklist: 'Document Checklist',
    costing_sheets: 'Costing Sheet',
    costing_sheet_approval: 'Costing Sheet Approval',
    bid_submission: 'Bid Submission',
};

const TimerDashboard = () => {
    const [searchBy, setSearchBy] = useState('id');
    const [searchValue, setSearchValue] = useState('');
    const [submittedBy, setSubmittedBy] = useState<string | null>(null);
    const [submittedValue, setSubmittedValue] = useState<string | null>(null);

    const { data, isLoading, isError, error } = useTimerDashboardSearch(submittedBy, submittedValue);
    const stopTimer = useStopTimer();

    const handleSearch = () => {
        if (!searchValue.trim()) return;
        setSubmittedBy(searchBy);
        setSubmittedValue(searchValue.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const formatDate = (d: Date | string | null | undefined) => {
        if (!d) return '—';
        return new Date(d).toLocaleString();
    };

    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'success' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
            running: { variant: 'outline', icon: <Clock className="w-3 h-3 mr-1" /> },
            paused: { variant: 'secondary', icon: <Clock className="w-3 h-3 mr-1" /> },
            completed: { variant: 'success', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
            overdue: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
            stopped: { variant: 'secondary', icon: <Square className="w-3 h-3 mr-1" /> },
            not_started: { variant: 'destructive', icon: null },
        };
        const v = variants[status] ?? { variant: 'default' as const, icon: null };
        return (
            <Badge variant={v.variant} className="font-mono">
                {v.icon}
                {status.replace('_', ' ')}
            </Badge>
        );
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

            {data && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {data.tender.tenderName}
                            </CardTitle>
                            <CardDescription>
                                Tender #{data.tender.tenderNo} &middot; ID: {data.tender.id}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Timers</CardTitle>
                            <CardDescription>
                                {data.timers.length} timer{data.timers.length !== 1 ? 's' : ''} found
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.timers.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No timers found for this tender.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
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
                                            {data.timers.map((timer: any) => (
                                                <tr key={timer.id} className="border-b hover:bg-muted/50">
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
                                                        {timer.status === 'RUNNING' && (
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
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default TimerDashboard;
