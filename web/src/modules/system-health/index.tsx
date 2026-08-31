import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useSystemHealth } from "@/hooks/api/useHealth";
import type {
    SubHealth,
    WorkerStatusDetail,
    QueueCounts,
    EmailHealth,
} from "@/services/api/health.service";

type StatusKind = "ok" | "degraded" | "down";

const statusVariant: Record<StatusKind, "success" | "secondary" | "destructive"> = {
    ok: "success",
    degraded: "secondary",
    down: "destructive",
};

const statusLabel: Record<StatusKind, string> = {
    ok: "Healthy",
    degraded: "Degraded",
    down: "Down",
};

function StatusPill({ status }: { status: StatusKind }) {
    return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}

function toStatusKind(status: string | undefined): StatusKind {
    return status === "ok" ? "ok" : status === "degraded" ? "degraded" : "down";
}

function QueueRow({ name, counts }: { name: string; counts?: QueueCounts }) {
    if (!counts) {
        return (
            <div className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="font-medium">{name}</span>
                <span className="text-sm text-muted-foreground">no data</span>
            </div>
        );
    }

    if (counts.error) {
        return (
            <div className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="font-medium">{name}</span>
                <span className="text-sm text-red-600">{counts.error}</span>
            </div>
        );
    }

    const hasFailure = (counts.failed ?? 0) > 0 || (counts.active ?? 0) > 0;
    return (
        <div className="flex items-center justify-between border-b py-2 last:border-0">
            <div className="flex items-center gap-2">
                <span className="font-medium">{name}</span>
                {hasFailure && <StatusPill status="degraded" />}
            </div>
            <div className="flex gap-3 text-sm text-muted-foreground">
                <span title="Waiting">W: {counts.waiting ?? 0}</span>
                <span title="Active">A: {counts.active ?? 0}</span>
                <span title="Delayed">D: {counts.delayed ?? 0}</span>
                <span className={counts.failed ? "text-red-600" : ""} title="Failed">
                    F: {counts.failed ?? 0}
                </span>
                <span title="Completed">C: {counts.completed ?? 0}</span>
            </div>
        </div>
    );
}

function WorkerRow({ name, detail }: { name: string; detail: WorkerStatusDetail | undefined }) {
    const status = toStatusKind(detail?.status);
    const lastSeen = detail?.lastSeen ? new Date(detail.lastSeen).toLocaleString() : "—";
    return (
        <div className="flex items-center justify-between border-b py-2 last:border-0">
            <div className="flex items-center gap-2">
                <span className="font-medium">{name}</span>
                <StatusPill status={status} />
            </div>
            <span className="text-sm text-muted-foreground">Last seen: {lastSeen}</span>
        </div>
    );
}

function SubsystemCard({
    title,
    status,
    children,
}: {
    title: string;
    status: StatusKind;
    children: React.ReactNode;
}) {
    return (
        <Card className="gap-4">
            <CardHeader className="px-5">
                <div className="flex items-center justify-between">
                    <CardTitle>{title}</CardTitle>
                    <StatusPill status={status} />
                </div>
            </CardHeader>
            <CardContent className="px-5 pt-0">{children}</CardContent>
        </Card>
    );
}

function ApiCard({ sub }: { sub: SubHealth<{ processId?: number; uptimeSeconds?: number; version?: string }> }) {
    const data = sub.data ?? {};
    const uptime = data.uptimeSeconds != null ? `${Math.floor(data.uptimeSeconds / 3600)}h ${Math.floor((data.uptimeSeconds % 3600) / 60)}m` : "—";
    return (
        <SubsystemCard title="API" status={toStatusKind(sub.status)}>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <div className="text-muted-foreground">Version</div>
                    <div className="font-medium">{data.version ?? "—"}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">Uptime</div>
                    <div className="font-medium">{uptime}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">PID</div>
                    <div className="font-medium">{data.processId ?? "—"}</div>
                </div>
            </div>
        </SubsystemCard>
    );
}

function DatabaseCard({ sub }: { sub: SubHealth<{ latencyMs?: number }> }) {
    return (
        <SubsystemCard title="Database" status={toStatusKind(sub.status)}>
            <div className="text-sm text-muted-foreground">
                {sub.data?.latencyMs != null ? `Query latency: ${sub.data.latencyMs}ms` : sub.error ?? "unavailable"}
            </div>
        </SubsystemCard>
    );
}

function RedisCard({ sub }: { sub: SubHealth<{ ping?: string }> }) {
    return (
        <SubsystemCard title="Redis" status={toStatusKind(sub.status)}>
            <div className="text-sm text-muted-foreground">
                {sub.data?.ping ? `PING ${sub.data.ping}` : sub.error ?? "unavailable"}
            </div>
        </SubsystemCard>
    );
}

function QueuesCard({ sub }: { sub: SubHealth<Record<string, QueueCounts>> }) {
    const queues = sub.data ?? {};
    const entries = Object.entries(queues);
    return (
        <SubsystemCard title="Queues" status={toStatusKind(sub.status)}>
            {entries.length === 0 ? (
                <div className="text-sm text-muted-foreground">{sub.error ?? "No queue data"}</div>
            ) : (
                entries.map(([name, counts]) => <QueueRow key={name} name={name} counts={counts} />)
            )}
        </SubsystemCard>
    );
}

function WorkersCard({ sub }: { sub: SubHealth<Record<string, WorkerStatusDetail>> }) {
    const workers = sub.data ?? {};
    const entries = Object.entries(workers);
    return (
        <SubsystemCard title="Workers" status={toStatusKind(sub.status)}>
            {entries.length === 0 ? (
                <div className="text-sm text-muted-foreground">{sub.error ?? "No worker data"}</div>
            ) : (
                entries.map(([name, detail]) => <WorkerRow key={name} name={name} detail={detail} />)
            )}
        </SubsystemCard>
    );
}

function EmailCard({ sub }: { sub: SubHealth<EmailHealth> }) {
    const data = sub.data;
    return (
        <SubsystemCard title="Email" status={toStatusKind(sub.status)}>
            {data ? (
                <div className="grid grid-cols-5 gap-3 text-sm">
                    <div>
                        <div className="text-muted-foreground">Pending</div>
                        <div className="font-medium">{data.pending}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Sending</div>
                        <div className="font-medium">{data.sending}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Sent</div>
                        <div className="font-medium">{data.sent}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Failed</div>
                        <div className={`font-medium ${data.failed ? "text-red-600" : ""}`}>{data.failed}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Last Attempt</div>
                        <div className="font-medium">
                            {data.lastAttemptAt ? new Date(data.lastAttemptAt).toLocaleString() : "—"}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-muted-foreground">{sub.error ?? "unavailable"}</div>
            )}
        </SubsystemCard>
    );
}

const SystemHealthPage = () => {
    const { data, isLoading, error, refetch, isFetching } = useSystemHealth();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="gap-4">
                        <CardHeader className="px-5">
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="px-5">
                            <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>System Health</CardTitle>
                    <CardDescription>Could not load system health</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {error ? (error as Error).message : "No data"}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const overview = data.data;
    const overall: StatusKind = toStatusKind(data.status);

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>System Health</CardTitle>
                            <CardDescription>
                                API {overview.api.data?.version ?? ""} · checked{" "}
                                {overview.api.data?.timestamp ? new Date(overview.api.data.timestamp).toLocaleTimeString() : "—"}
                            </CardDescription>
                        </div>
                        <CardAction>
                            <div className="flex items-center gap-3">
                                <StatusPill status={overall} />
                                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                        </CardAction>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ApiCard sub={overview.api} />
                <DatabaseCard sub={overview.database} />
                <RedisCard sub={overview.redis} />
                <WorkersCard sub={overview.workers} />
                <QueuesCard sub={overview.queues} />
                <EmailCard sub={overview.email} />
            </div>
        </div>
    );
};

export default SystemHealthPage;
