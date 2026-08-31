import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertCircle,
    Database,
    Gauge,
    Mail,
    RefreshCw,
    Server,
    Activity,
    Layers,
    Wifi,
    Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSystemHealth } from "@/hooks/api/useHealth";
import type {
    SubHealth,
    WorkerStatusDetail,
    QueueCounts,
    EmailHealth,
} from "@/services/api/health.service";

type StatusKind = "ok" | "degraded" | "down";

const statusDotClass: Record<StatusKind, string> = {
    ok: "bg-emerald-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
};

const statusTextClass: Record<StatusKind, string> = {
    ok: "text-emerald-600",
    degraded: "text-amber-600",
    down: "text-red-600",
};

const statusLabel: Record<StatusKind, string> = {
    ok: "Healthy",
    degraded: "Degraded",
    down: "Down",
};

const overallLabel: Record<StatusKind, string> = {
    ok: "All systems operational",
    degraded: "Degraded performance",
    down: "System down",
};

function toStatusKind(status: string | undefined): StatusKind {
    return status === "ok" ? "ok" : status === "degraded" ? "degraded" : "down";
}

function relativeTime(value?: string | null): string {
    if (!value) return "—";
    const ms = Date.now() - Date.parse(value);
    if (Number.isNaN(ms)) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function formatUptime(seconds?: number): string {
    if (seconds == null) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function StatusDot({ status, pulse = false }: { status: StatusKind; pulse?: boolean }) {
    return (
        <span className="relative inline-flex h-2.5 w-2.5">
            {pulse && (
                <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${statusDotClass[status]}`}
                />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass[status]}`} />
        </span>
    );
}

function StatusPill({ status }: { status: StatusKind }) {
    const map: Record<StatusKind, "success" | "secondary" | "destructive"> = {
        ok: "success",
        degraded: "secondary",
        down: "destructive",
    };
    return <Badge variant={map[status]}>{statusLabel[status]}</Badge>;
}

function latencyColor(latencyMs?: number): string {
    if (latencyMs == null) return "bg-muted";
    if (latencyMs < 50) return "bg-emerald-500";
    if (latencyMs < 200) return "bg-amber-500";
    return "bg-red-500";
}

function pressurePercent(counts?: QueueCounts): number {
    if (!counts) return 0;
    const processed = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0) + (counts.failed ?? 0);
    if (processed === 0) return 0;
    return Math.min(100, Math.round(((counts.failed ?? 0) * 100) / processed));
}

function queueBarColor(counts?: QueueCounts): string {
    if (!counts) return "bg-muted";
    const failed = counts.failed ?? 0;
    const total = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0) + failed;
    if (failed === 0 || total === 0) return "bg-emerald-500";
    if ((failed / total) < 0.1) return "bg-amber-500";
    return "bg-red-500";
}

function ToneBar({ value, colorClass, max = 100 }: { value?: number; colorClass: string; max?: number }) {
    const pct = Math.max(0, Math.min(100, ((value ?? 0) / max) * 100));
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function HeaderBanner({
    status,
    version,
    lastChecked,
    onRefresh,
    isRefreshing,
}: {
    status: StatusKind;
    version?: string;
    lastChecked?: string;
    onRefresh: () => void;
    isRefreshing: boolean;
}) {
    const pingClass = isRefreshing ? "animate-ping" : "";
    return (
        <div className="relative overflow-hidden rounded-xl border">
            <div className={`h-1.5 w-full ${statusDotClass[status]}`} />
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-background">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">System Health</h1>
                            {version && (
                                <Badge variant="outline" className="text-muted-foreground">
                                    v{version}
                                </Badge>
                            )}
                        </div>
                        <p className={`mt-1 flex items-center gap-2 text-sm font-medium ${statusTextClass[status]}`}>
                            <StatusDot status={status} pulse />
                            {overallLabel[status]}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        <span className={`inline-flex h-2 w-2 rounded-full bg-emerald-500 ${pingClass}`} />
                        Auto-refresh 30s
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Last checked {lastChecked ? relativeTime(lastChecked) : "—"}
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
                </div>
            </div>
        </div>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
    status,
    barValue,
    barClass,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub: string;
    status: StatusKind;
    barValue?: number;
    barClass?: string;
}) {
    return (
        <Card className="gap-3 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                </div>
                <StatusDot status={status} />
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-2xl font-semibold tracking-tight">{value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
                </div>
            </div>
            {barValue != null && (
                <ToneBar value={barValue} colorClass={barClass ?? "bg-emerald-500"} />
            )}
        </Card>
    );
}

function QueueRow({ name, counts }: { name: string; counts?: QueueCounts }) {
    if (!counts) {
        return (
            <div className="flex items-center justify-between border-b py-2.5 last:border-0">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">no data</span>
            </div>
        );
    }

    if (counts.error) {
        return (
            <div className="flex items-center justify-between border-b py-2.5 last:border-0">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-red-600">{counts.error}</span>
            </div>
        );
    }

    return (
        <div className="border-b py-2.5 last:border-0">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{name}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span title="Waiting">W <span className="font-medium text-foreground">{counts.waiting ?? 0}</span></span>
                    <span title="Active">A <span className="font-medium text-foreground">{counts.active ?? 0}</span></span>
                    <span title="Delayed">D <span className="font-medium text-foreground">{counts.delayed ?? 0}</span></span>
                    <span title="Completed">C <span className="font-medium text-foreground">{counts.completed ?? 0}</span></span>
                    <span title="Failed" className={counts.failed ? "text-red-600" : ""}>
                        F <span className="font-medium">{counts.failed ?? 0}</span>
                    </span>
                </span>
            </div>
            <ToneBar value={pressurePercent(counts)} colorClass={queueBarColor(counts)} />
        </div>
    );
}

function WorkerRow({ name, detail }: { name: string; detail: WorkerStatusDetail | undefined }) {
    const status = toStatusKind(detail?.status);
    const lastSeen = detail?.lastSeen;
    return (
        <div className="flex items-center justify-between border-b py-2.5 last:border-0">
            <div className="flex items-center gap-2">
                <StatusDot status={status} pulse={status === "ok"} />
                <span className="text-sm font-medium">{name}</span>
                {detail?.queue && (
                    <Badge variant="secondary" className="text-[10px]">
                        {detail.queue}
                    </Badge>
                )}
            </div>
            <div className="flex items-center gap-3">
                <StatusPill status={status} />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default text-xs text-muted-foreground">
                                {lastSeen ? relativeTime(lastSeen) : "—"}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            {lastSeen ? new Date(lastSeen).toLocaleString() : "never seen"}
                            {detail?.pid ? ` · PID ${detail.pid}` : ""}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

function WorkersCard({ sub }: { sub: SubHealth<Record<string, WorkerStatusDetail>> }) {
    const workers = sub.data ?? {};
    const entries = Object.entries(workers);
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Workers</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                {entries.length === 0 ? (
                    <div className="py-2 text-sm text-muted-foreground">{sub.error ?? "No worker data"}</div>
                ) : (
                    entries.map(([name, detail]) => <WorkerRow key={name} name={name} detail={detail} />)
                )}
            </CardContent>
        </Card>
    );
}

function QueuesCard({ sub }: { sub: SubHealth<Record<string, QueueCounts>> }) {
    const queues = sub.data ?? {};
    const entries = Object.entries(queues);
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Queues</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                {entries.length === 0 ? (
                    <div className="py-2 text-sm text-muted-foreground">{sub.error ?? "No queue data"}</div>
                ) : (
                    entries.map(([name, counts]) => <QueueRow key={name} name={name} counts={counts} />)
                )}
            </CardContent>
        </Card>
    );
}

function EmailCard({ sub }: { sub: SubHealth<EmailHealth> }) {
    const data = sub.data;
    const metrics = data
        ? [
              { label: "Sent", value: data.sent, className: "" },
              { label: "Pending", value: data.pending, className: "" },
              { label: "Sending", value: data.sending, className: "" },
              { label: "Failed", value: data.failed, className: data.failed ? "text-red-600" : "" },
          ]
        : [];
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Email</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                {data ? (
                    <>
                        <div className="grid grid-cols-4 gap-2">
                            {metrics.map((m) => (
                                <div key={m.label} className="rounded-lg border bg-muted/30 p-2">
                                    <div className={`text-lg font-semibold ${m.className}`}>{m.value.toLocaleString()}</div>
                                    <div className="text-[11px] text-muted-foreground">{m.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                            Last attempt {data.lastAttemptAt ? relativeTime(data.lastAttemptAt) : "—"}
                        </div>
                    </>
                ) : (
                    <div className="py-2 text-sm text-muted-foreground">{sub.error ?? "unavailable"}</div>
                )}
            </CardContent>
        </Card>
    );
}

function ApiCard({ sub }: { sub: SubHealth<{ processId?: number; uptimeSeconds?: number; version?: string }> }) {
    const data = sub.data ?? {};
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">API</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground">Version</div>
                        <div className="font-medium">{data.version ?? "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                        <div className="font-medium">{formatUptime(data.uptimeSeconds)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">PID</div>
                        <div className="font-medium">{data.processId ?? "—"}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DatabaseCard({ sub }: { sub: SubHealth<{ latencyMs?: number }> }) {
    const latency = sub.data?.latencyMs;
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Database</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Query latency</span>
                    <span className="font-medium">{latency != null ? `${latency}ms` : sub.error ?? "—"}</span>
                </div>
                <ToneBar value={latency ?? 0} colorClass={latencyColor(latency)} />
            </CardContent>
        </Card>
    );
}

function RedisCard({ sub }: { sub: SubHealth<{ ping?: string }> }) {
    const ping = sub.data?.ping;
    return (
        <Card className="gap-0">
            <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Redis</CardTitle>
                    </div>
                    <StatusPill status={toStatusKind(sub.status)} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
                <div className="text-sm text-muted-foreground">
                    {ping ? (
                        <span className="flex items-center gap-2 font-medium text-foreground">
                            <Gauge className="h-4 w-4 text-emerald-500" />
                            {ping} · reachable
                        </span>
                    ) : (
                        sub.error ?? "unavailable"
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function SkeletonDashboard() {
    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-xl border p-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-11 w-11 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

const SystemHealthPage = () => {
    const { data, isLoading, error, refetch, isFetching } = useSystemHealth();

    if (isLoading) return <SkeletonDashboard />;

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Could not load system health</AlertTitle>
                        <AlertDescription className="mt-1">
                            {error ? (error as Error).message : "No data available"}
                        </AlertDescription>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                            Try again
                        </Button>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const overview = data.data;
    const overall: StatusKind = toStatusKind(data.status);
    const apiData = overview.api.data;
    const dbData = overview.database.data;
    const emailData = overview.email.data;

    const queueBacklog = Object.values(overview.queues.data ?? {}).reduce(
        (sum, q) => sum + (q?.waiting ?? 0) + (q?.delayed ?? 0),
        0,
    );
    const totalWorkers = Object.keys(overview.workers.data ?? {}).length;
    const upWorkers = Object.values(overview.workers.data ?? {}).filter((w) => w?.status === "up").length;

    return (
        <div className="space-y-6 p-6">
            <HeaderBanner
                status={overall}
                version={apiData?.version}
                lastChecked={apiData?.timestamp}
                onRefresh={() => refetch()}
                isRefreshing={isFetching}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <KpiCard
                    icon={Server}
                    label="API"
                    value={apiData?.version ?? "—"}
                    sub={`up ${formatUptime(apiData?.uptimeSeconds)}`}
                    status={toStatusKind(overview.api.status)}
                />
                <KpiCard
                    icon={Database}
                    label="Database"
                    value={dbData?.latencyMs != null ? `${dbData.latencyMs}ms` : "—"}
                    sub="query latency"
                    status={toStatusKind(overview.database.status)}
                    barValue={dbData?.latencyMs != null ? Math.min(100, dbData.latencyMs) : 0}
                    barClass={latencyColor(dbData?.latencyMs)}
                />
                <KpiCard
                    icon={Layers}
                    label="Queues"
                    value={queueBacklog.toLocaleString()}
                    sub="waiting + delayed"
                    status={toStatusKind(overview.queues.status)}
                    barValue={queueBacklog > 0 ? 100 : 0}
                    barClass={queueBacklog > 0 ? "bg-amber-500" : "bg-emerald-500"}
                />
                <KpiCard
                    icon={Cpu}
                    label="Workers"
                    value={`${upWorkers}/${totalWorkers}`}
                    sub="online"
                    status={toStatusKind(overview.workers.status)}
                />
                <KpiCard
                    icon={Mail}
                    label="Email"
                    value={emailData?.sent?.toLocaleString() ?? "—"}
                    sub={emailData ? `${emailData.failed} failed` : "unavailable"}
                    status={toStatusKind(overview.email.status)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ApiCard sub={overview.api} />
                <DatabaseCard sub={overview.database} />
                <RedisCard sub={overview.redis} />
                <EmailCard sub={overview.email} />
                <WorkersCard sub={overview.workers} />
                <QueuesCard sub={overview.queues} />
            </div>

            {isFetching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Refreshing…
                </div>
            )}
        </div>
    );
};

export default SystemHealthPage;
