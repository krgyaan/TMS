import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, Mail, RefreshCw, Server, Activity, Layers, Wifi, Cpu, Bot } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useSystemHealth, useTallyStatus } from "@/hooks/api/useHealth";
import { ClaudeTelemetrySection } from "./components/ClaudeTelemetrySection";
import { TallyStatusCard } from "./components/TallyStatusCard";
import type { WorkerStatusDetail, QueueCounts } from "@/services/api/health.service";

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

function latencyColor(latencyMs?: number): string {
    if (latencyMs == null) return "bg-muted";
    if (latencyMs < 50) return "bg-emerald-500";
    if (latencyMs < 200) return "bg-amber-500";
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
    children,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub: string;
    status: StatusKind;
    barValue?: number;
    barClass?: string;
    children?: ReactNode;
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
            {children}
        </Card>
    );
}

function workerStatus(detail?: WorkerStatusDetail): StatusKind {
    if (detail?.status === "up") return "ok";
    if (detail?.status === "stale") return "degraded";
    return "down";
}

function QueueNameList({ queues }: { queues: Record<string, QueueCounts> }) {
    const entries = Object.entries(queues);
    if (entries.length === 0) {
        return <div className="text-xs text-muted-foreground">No queue data</div>;
    }
    return (
        <div className="mt-2 space-y-1 border-t pt-2">
            {entries.map(([name, counts]) => (
                <div key={name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium" title={name}>
                        {name}
                    </span>
                    {counts?.error ? (
                        <span className="shrink-0 text-red-600">{counts.error}</span>
                    ) : (
                        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                            <span title="Waiting">W <span className="font-medium text-foreground">{counts?.waiting ?? 0}</span></span>
                            <span title="Delayed">D <span className="font-medium text-foreground">{counts?.delayed ?? 0}</span></span>
                            <span title="Failed" className={counts?.failed ? "text-red-600" : ""}>
                                F <span className="font-medium">{counts?.failed ?? 0}</span>
                            </span>
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

function WorkerNameList({ workers }: { workers: Record<string, WorkerStatusDetail> }) {
    const entries = Object.entries(workers);
    if (entries.length === 0) {
        return <div className="text-xs text-muted-foreground">No worker data</div>;
    }
    return (
        <div className="mt-2 space-y-1 border-t pt-2">
            {entries.map(([name, detail]) => {
                const status = workerStatus(detail);
                return (
                    <div key={name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                            <StatusDot status={status} pulse={status === "ok"} />
                            <span className="truncate font-medium" title={name}>
                                {name}
                            </span>
                        </span>
                        {detail?.queue && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                                {detail.queue}
                            </Badge>
                        )}
                    </div>
                );
            })}
        </div>
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

const SystemHealthPage = () => {
    const { data, isLoading, error, refetch, isFetching } = useSystemHealth();
    const tallyStatus = useTallyStatus();

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
    const redisData = overview.redis.data;
    const emailData = overview.email.data;
    const queueData = overview.queues.data ?? {};
    const workerData = overview.workers.data ?? {};

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

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
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
                    icon={Wifi}
                    label="Redis"
                    value={redisData?.ping ?? "—"}
                    sub={redisData?.ping ? "reachable" : (overview.redis.error ?? "unavailable")}
                    status={toStatusKind(overview.redis.status)}
                />
                <KpiCard
                    icon={Layers}
                    label="Queues"
                    value={queueBacklog.toLocaleString()}
                    sub="waiting + delayed"
                    status={toStatusKind(overview.queues.status)}
                    barValue={queueBacklog > 0 ? 100 : 0}
                    barClass={queueBacklog > 0 ? "bg-amber-500" : "bg-emerald-500"}
                >
                    <QueueNameList queues={queueData} />
                </KpiCard>
                <KpiCard
                    icon={Cpu}
                    label="Workers"
                    value={`${upWorkers}/${totalWorkers}`}
                    sub="online"
                    status={toStatusKind(overview.workers.status)}
                >
                    <WorkerNameList workers={workerData} />
                </KpiCard>
                <KpiCard
                    icon={Mail}
                    label="Email"
                    value={emailData?.sent?.toLocaleString() ?? "—"}
                    sub={emailData ? `${emailData.failed} failed` : "unavailable"}
                    status={toStatusKind(overview.email.status)}
                />
                <KpiCard
                    icon={Bot}
                    label="Claude AI"
                    value={overview.claude?.data?.currentTpm != null ? `${overview.claude.data.currentTpm} TPM` : "0 TPM"}
                    sub={overview.claude?.status === "ok" ? "sliding window active" : (overview.claude?.error ?? "active")}
                    status={toStatusKind(overview.claude?.status ?? "ok")}
                />
            </div>

            <TallyStatusCard
                status={tallyStatus.data}
                isLoading={tallyStatus.isLoading}
                isFetching={tallyStatus.isFetching}
                error={tallyStatus.error}
            />

            {/* Claude AI Token Telemetry, Sliding TPM & Leaderboard */}
            <ClaudeTelemetrySection />

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
