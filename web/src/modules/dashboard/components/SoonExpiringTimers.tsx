import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpiringSoonTimers } from "@/hooks/api/useTimerDashboard";
import { AlertTriangle, Clock, Loader2, PauseCircle, PlayCircle, TimerReset, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExpiringTimer } from "@/services/api/timer-dashboard.service";

const stageNameMap: Record<string, string> = {
    tender_info: 'Tender Info',
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
    pop_acc_form: 'Pay on Portal - Accounts Form',
    bt_acc_form: 'Bank Transfer - Accounts Form',
    cheque_acc_form: 'Cheque - Accounts Form',
    cheque_ac_form: 'Cheque - Accounts Form',
    dd_acc_form: 'Demand Draft - Accounts Form',
    fdr_acc_form: 'FDR - Accounts Form',
    bg_acc_form: 'Bank Guarantee - Accounts Form',
};

const getStageName = (timer: ExpiringTimer) => {
    const metadataStepName = timer.metadata?.stepName;
    if (typeof metadataStepName === 'string' && metadataStepName) return metadataStepName;
    return stageNameMap[timer.stage] || timer.stage.replace(/_/g, ' ');
};

const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const StatusBadge = ({ status }: { status: string }) => {
    const isPaused = status === 'paused';
    return (
        <Badge variant={isPaused ? "secondary" : "outline"} className="font-mono gap-1">
            {isPaused ? <PauseCircle className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
            {isPaused ? 'Paused' : 'Running'}
        </Badge>
    );
};

const getEntityRoute = (timer: ExpiringTimer) => {
    const entity = timer.entity;
    if (!entity) return null;
    if (entity.type === 'TENDER') return paths.tendering.tenderView(entity.id);
    if (entity.type === 'EMD') return paths.tendering.emdsTenderFeesView(entity.id);
    return null;
};

const getEntityTitle = (timer: ExpiringTimer) => {
    const entity = timer.entity;
    if (!entity) return `#${timer.entityId}`;
    if (entity.type === 'TENDER') {
        return entity.tenderName || entity.tenderNo || `Tender #${entity.id}`;
    }
    if (entity.type === 'EMD') {
        return entity.projectName || `EMD #${entity.id}`;
    }
    return `#${timer.entityId}`;
};

const getEntitySubtitle = (timer: ExpiringTimer) => {
    const entity = timer.entity;
    if (!entity) return '';
    if (entity.type === 'TENDER') {
        return `Tender No: ${entity.tenderNo || '—'}`;
    }
    if (entity.type === 'EMD') {
        return `Amount: ₹${entity.amountRequired || '—'} · Tender No: ${entity.tenderNo || '—'}`;
    }
    return '';
};

const getRemainingMs = (timer: ExpiringTimer, now: number) => {
    if (!timer.deadlineAt) return 0;
    return new Date(timer.deadlineAt).getTime() - now;
};

export const SoonExpiringTimers = ({ withinHours = 12 }: { withinHours?: number }) => {
    const navigate = useNavigate();
    const { data, isLoading, error } = useExpiringSoonTimers(withinHours, false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const timers = data?.timers || [];
    const countdownColor = (timer: ExpiringTimer) => {
        const remainingMs = getRemainingMs(timer, now);
        if (remainingMs <= 0) return 'text-destructive';
        if (remainingMs <= 2 * 60 * 60 * 1000) return 'text-amber-600 dark:text-amber-500';
        return 'text-foreground';
    };

    return (
        <Card className="col-span-1 border border-border/50 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
            <CardHeader className="border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-500 rounded-xl">
                            <TimerReset className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="font-bold">Soon Expiring Timers</CardTitle>
                            <p className="text-xs text-muted-foreground">Deadlines due within {withinHours} hours</p>
                        </div>
                    </div>
                    {timers.length > 0 && (
                        <Badge variant="secondary" className="font-mono bg-amber-500/10 text-amber-600 dark:text-amber-500 border-none rounded-full">
                            {timers.length}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Loading timers...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">Failed to load timers</p>
                    </div>
                ) : timers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No timers expiring soon</p>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">All active timers have more than {withinHours} hours remaining.</p>
                    </div>
                ) : (
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
                        {timers.map((timer) => (
                            <div
                                key={timer.id}
                                onClick={() => {
                                    const route = getEntityRoute(timer);
                                    if (route) navigate(route);
                                }}
                                className="group px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                            {getEntityTitle(timer)}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{getEntitySubtitle(timer)}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {getStageName(timer)}
                                            </Badge>
                                            <StatusBadge status={timer.status} />
                                            {timer.entity?.type === 'EMD' && (
                                                <Badge variant="secondary" className="font-mono text-[10px]">EMD</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span
                                            className={`font-mono text-sm font-bold tabular-nums ${countdownColor(timer)}`}
                                        >
                                            {getRemainingMs(timer, now) <= 0
                                                ? `+${formatCountdown(-getRemainingMs(timer, now))} overdue`
                                                : formatCountdown(getRemainingMs(timer, now))}
                                        </span>
                                        {timer.assignedUserName && (
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                {timer.assignedUserName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};