import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, Clock, Gauge, Globe, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import type { TallyStatus, TallyStatusState } from "@/services/api/health.service";

interface TallyStatusCardProps {
    status?: TallyStatus;
    isLoading?: boolean;
    isFetching?: boolean;
    error?: Error | null;
}

const STATUS_META: Record<
    TallyStatusState,
    { label: string; dot: string; text: string; badge: "default" | "secondary" | "destructive" | "outline" }
> = {
    ok: { label: "Connected", dot: "bg-emerald-500", text: "text-emerald-600", badge: "default" },
    degraded: { label: "Degraded", dot: "bg-amber-500", text: "text-amber-600", badge: "secondary" },
    down: { label: "Down", dot: "bg-red-500", text: "text-red-600", badge: "destructive" },
    disabled: { label: "Disabled", dot: "bg-muted-foreground", text: "text-muted-foreground", badge: "outline" },
};

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
    return `${Math.floor(h / 24)}d ago`;
}

function BoolValue({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
    return <span className={value ? "font-medium text-emerald-600" : "font-medium text-red-600"}>{value ? trueLabel : falseLabel}</span>;
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {icon}
                {title}
            </div>
            <dl className="space-y-1.5 text-sm">{children}</dl>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right">{children}</dd>
        </div>
    );
}

export function TallyStatusCard({ status, isLoading, isFetching, error }: TallyStatusCardProps) {
    if (isLoading) {
        return <Skeleton className="h-64 w-full rounded-xl" />;
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>TallyPrime</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Could not load Tally status</AlertTitle>
                        <AlertDescription className="mt-1">{error.message}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!status) return null;

    const meta = STATUS_META[status.status];
    const connection = status.connection;
    const company = status.company;

    return (
        <Card>
            <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                            <Landmark className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                TallyPrime
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                                <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
                            </CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">{status.message}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {connection.host && (
                            <Badge variant="outline" className="gap-1">
                                <Globe className="h-3 w-3" />
                                {connection.host}
                            </Badge>
                        )}
                        {status.stale && <Badge variant="secondary">last known</Badge>}
                        {isFetching && <Badge variant="outline">refreshing</Badge>}
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Section icon={<Globe className="h-3.5 w-3.5" />} title="Connection">
                    <Row label="Enabled">
                        <BoolValue value={connection.enabled} />
                    </Row>
                    <Row label="Reachable">
                        <BoolValue value={connection.reachable} />
                    </Row>
                    <Row label="Auth token">
                        <BoolValue value={connection.authOk} trueLabel="Accepted" falseLabel="Rejected" />
                    </Row>
                    <Row label="Latency">{connection.latencyMs != null ? `${connection.latencyMs} ms` : "—"}</Row>
                    <Row label="Checked">{relativeTime(status.checkedAt)}</Row>
                </Section>

                <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Company">
                    <Row label="Configured">
                        <span className="font-medium">{company.configured ?? "—"}</span>
                    </Row>
                    <Row label="Open">
                        <BoolValue value={company.open} />
                    </Row>
                    <Row label="Loaded">
                        <BoolValue value={company.loaded} />
                    </Row>
                    <Row label="Loaded companies">
                        {company.loadedCompanies.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1">
                                {company.loadedCompanies.map(name => (
                                    <Badge
                                        key={name}
                                        variant={name === company.configured ? "default" : "outline"}
                                        className="text-[10px]"
                                    >
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">None</span>
                        )}
                    </Row>
                </Section>

                <Section icon={<Gauge className="h-3.5 w-3.5" />} title="Limits">
                    <Row label="Rate limit">{status.limits.rateLimitRps} req/s</Row>
                    <Row label="Concurrency">{status.limits.maxConcurrency}</Row>
                    <Row label="Connect timeout">{status.limits.connectTimeoutMs} ms</Row>
                    <Row label="Read timeout">{status.limits.httpTimeoutMs} ms</Row>
                </Section>

                <Section icon={<Clock className="h-3.5 w-3.5" />} title="Cache & history">
                    <Row label="Cache age">
                        {status.cache.ageSeconds}s / {status.cache.ttlSeconds}s
                    </Row>
                    <Row label="Last OK">{relativeTime(status.lastSuccessAt)}</Row>
                    <Row label="Last failure">
                        {status.lastFailure ? (
                            <Badge variant="outline" className="text-[10px]">
                                {status.lastFailure.code}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground">None</span>
                        )}
                    </Row>
                    {status.lastFailure && <Row label="Failed at">{relativeTime(status.lastFailure.at)}</Row>}
                </Section>
            </CardContent>
        </Card>
    );
}

export default TallyStatusCard;
