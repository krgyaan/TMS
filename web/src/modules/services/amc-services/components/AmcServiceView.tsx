import { useState } from "react";
import { FileText, FileSignature, MapPin, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDate, formatDateTime } from "@/hooks/useFormatedDate";
import { cn } from "@/lib/utils";
import { useAmc } from "@/hooks/api/useAmc";
import { useUsers } from "@/hooks/api/useUsers";
import type { AmcServiceDetail } from "@/modules/services/amc/helpers/amc.types";
import { serviceFileUrl } from "@/modules/services/amc/helpers/amc.types";
import { UploadedByTooltip } from "@/modules/services/amc/helpers/UploadedByMeta";

export function AmcServiceView({ service }: { service: AmcServiceDetail }) {
    const { data: users = [] } = useUsers();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>{service.amc?.projectName ?? "Project"}</CardTitle>
                        <CardDescription>
                            Service No. {service.serviceNo} — due {formatDate(service.serviceDueDate)}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "capitalize",
                            service.status === "Done"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-amber-100 text-amber-800 border-amber-200",
                        )}
                    >
                        {service.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Site
                            </TableCell>
                            <TableCell className="text-sm">
                                <div className="flex flex-col">
                                    <span>{service.site?.name ?? "—"}</span>
                                    {service.site?.address && (
                                        <span className="text-xs text-muted-foreground">
                                            {service.site.address}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Contact
                            </TableCell>
                            <TableCell className="text-sm">
                                {service.site?.contacts?.[0] ? (
                                    <div className="flex flex-col">
                                        <span>{service.site.contacts[0].name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {service.site.contacts[0].mobile}
                                        </span>
                                    </div>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Service Engg Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {service.amc?.serviceEngineers?.[0]?.name ?? "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Service Due Date
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(service.serviceDueDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Service Completed Date
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(service.serviceCompletedDate)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filled Service Report
                        </p>
                        {service.filledReport ? (
                            <UploadedByTooltip
                                path={serviceFileUrl(service.filledReport)}
                                users={users}
                            >
                                <a
                                    href={serviceFileUrl(service.filledReport)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <FileText className="h-3.5 w-3.5" /> View
                                </a>
                            </UploadedByTooltip>
                        ) : (
                            <span className="text-sm text-muted-foreground">Not uploaded</span>
                        )}
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Signed Service Report
                        </p>
                        {service.signedReport ? (
                            <UploadedByTooltip
                                path={serviceFileUrl(service.signedReport)}
                                users={users}
                            >
                                <a
                                    href={serviceFileUrl(service.signedReport)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <FileSignature className="h-3.5 w-3.5" /> View
                                </a>
                            </UploadedByTooltip>
                        ) : (
                            <span className="text-sm text-muted-foreground">Not uploaded</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AmcServiceSection({ amcId }: { amcId: number }) {
    const { data: amc, isLoading } = useAmc(amcId);
    const { data: users = [] } = useUsers();

    const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null);

    if (isLoading && !amc) {
        return <p className="text-sm text-muted-foreground">Loading service details…</p>;
    }

    if (!amc) {
        return <p className="text-sm text-muted-foreground">AMC information not available.</p>;
    }

    const services = amc.services ?? [];
    if (services.length === 0) {
        return <p className="text-sm text-muted-foreground">No service schedule generated yet.</p>;
    }

    return (
        <div className="space-y-4">
            {amc.sites.map(site => {
                const siteServices = services.filter(s => s.amcSiteId === site.id);
                if (siteServices.length === 0) return null;
                const isOpen = expandedSiteId === site.id;
                return (
                    <Collapsible
                        key={site.id}
                        open={isOpen}
                        onOpenChange={open => setExpandedSiteId(open ? site.id ?? null : null)}
                        className="rounded-lg border bg-card"
                    >
                        <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    {site.name}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {siteServices.length} {siteServices.length === 1 ? "service" : "services"}
                                    </Badge>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform",
                                            isOpen && "rotate-180",
                                        )}
                                    />
                                </div>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="border-t overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Service No.</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Completed Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Filled Report</TableHead>
                                            <TableHead>Signed Report</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {siteServices.map(s => (
                                            <TableRow key={s.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium tabular-nums">
                                                    {s.serviceNo}
                                                </TableCell>
                                                <TableCell>{formatDate(s.serviceDueDate)}</TableCell>
                                                <TableCell>
                                                    {s.serviceCompletedDate
                                                        ? formatDateTime(s.serviceCompletedDate)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "capitalize",
                                                            s.status === "Done"
                                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                                : "bg-amber-100 text-amber-800 border-amber-200",
                                                        )}
                                                    >
                                                        {s.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {s.filledReport ? (
                                                        <UploadedByTooltip
                                                            path={serviceFileUrl(s.filledReport)}
                                                            users={users}
                                                        >
                                                            <a
                                                                href={serviceFileUrl(s.filledReport)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                            >
                                                                <FileText className="h-3.5 w-3.5" /> View
                                                            </a>
                                                        </UploadedByTooltip>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Not uploaded
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {s.signedReport ? (
                                                        <UploadedByTooltip
                                                            path={serviceFileUrl(s.signedReport)}
                                                            users={users}
                                                        >
                                                            <a
                                                                href={serviceFileUrl(s.signedReport)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                            >
                                                                <FileSignature className="h-3.5 w-3.5" /> View
                                                            </a>
                                                        </UploadedByTooltip>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Not uploaded
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}
