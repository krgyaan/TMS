import type { ReactNode } from "react";
import { ExternalLink, MapPin, Package, Wrench, FileText, BadgeDollarSign, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useItems } from "@/hooks/api/useItems";
import { useUsers } from "@/hooks/api/useUsers";
import type { AmcDetail } from "../helpers/amc.types";
import { sampleReport, filledReport, serviceFileUrl } from "../helpers/amc.types";

const fileUrl = (name?: string | null) => (name ? `/uploads/amc/${name}` : "");

function fmtDate(v?: string | null) {
    if (!v) return "—";
    try { return format(new Date(v), "PP"); } catch { return v; }
}

function fmtDateTime(v?: string | null) {
    if (!v) return "—";
    try { return format(new Date(v), "PP p"); } catch { return v; }
}

function fmtBillDate(v?: string | null) {
    if (!v) return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtDate(v);
    return v;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const sectionCls = "py-6 px-6 border-b last:border-b-0";

const sectionTitleCls =
    "text-sm font-semibold flex items-center gap-2 text-foreground mb-4";

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <h3 className={sectionTitleCls}>
            {icon}
            {children}
        </h3>
    );
}

/** Shaded header row inside an info table */
function SectionRow({ children }: { children: ReactNode }) {
    return (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {children}
            </TableCell>
        </TableRow>
    );
}

/** Label + value pair occupying two cells */
function InfoCell({ label, value }: { label: string; value: ReactNode }) {
    return (
        <>
            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">
                {label}
            </TableCell>
            <TableCell className="text-sm font-semibold w-[32%]">
                {value ?? "—"}
            </TableCell>
        </>
    );
}

function FileDownload({ label, path }: { label: string; path: string }) {
    if (!path) {
        return (
            <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge variant="outline" className="text-xs">No file</Badge>
            </div>
        );
    }
    return (
        <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
            <Download className="h-4 w-4" />
            {label}
        </a>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────────────────────────────────────

export function AmcView({ amc }: { amc: AmcDetail }) {
    const { data: projects = [] } = useProjectsMaster();
    const { data: items = [] } = useItems();
    const { data: allUsers = [] } = useUsers();

    const project = projects.find(p => p.id === amc.projectId);
    const itemName = (id: number) => items.find(i => i.id === id)?.name || `Item ${id}`;
    const allocatedTeUser = allUsers.find(u => u.id === amc.allocatedTe);
    const allocatedTeName = allocatedTeUser
        ? allocatedTeUser.team?.name
            ? `${allocatedTeUser.name} (${allocatedTeUser.team.name})`
            : (allocatedTeUser.name ?? "—")
        : null;

    return (
        <Card className="overflow-hidden">

            {/* ── Card header ─────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    AMC / Warranty Service
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Full details for AMC #{amc.id}
                </p>
            </div>

            {/* ── 1. Basic Information ────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Basic Information
                </SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Team Name" value={amc.teamName} />
                                <InfoCell
                                    label="Project"
                                    value={project?.projectName || amc.projectId}
                                />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Allocated TE" value={allocatedTeName ?? "—"} />
                                <TableCell colSpan={2} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Service Frequency" value={amc.serviceFrequency} />
                                <InfoCell label="Bill Frequency" value={amc.billFrequency} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="AMC Start Date" value={fmtDate(amc.amcStartDate)} />
                                <InfoCell label="AMC End Date" value={fmtDate(amc.amcEndDate)} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Next Service Due" value={fmtDate(amc.nextServiceDue)} />
                                <InfoCell
                                    label="Bill Type"
                                    value={
                                        <Badge variant="outline">
                                            {amc.billType === "variable" ? "Variable" : "Constant"}
                                        </Badge>
                                    }
                                />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ── 2. Billing Information ──────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<BadgeDollarSign className="h-4 w-4" />}>
                    Billing Information
                </SectionTitle>

                {amc.bills?.length ? (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Bill No.</TableHead>
                                    <TableHead>Bill Due Date</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Amount (Pre GST)</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.bills.map(bill => (
                                    <TableRow key={bill.id} className="hover:bg-muted/30">
                                        <TableCell>{bill.billNo}</TableCell>
                                        <TableCell>{fmtDate(bill.billDueDate)}</TableCell>
                                        <TableCell>
                                            {amc.sites.find(s => s.id === bill.amcSiteId)?.name ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {bill.amount != null ? bill.amount : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {bill.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : amc.billType === "constant" ? (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-muted/30">
                                    <InfoCell label="Bill Value" value={amc.billValue} />
                                    <TableCell />
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Bill Date / Quarter</TableHead>
                                    <TableHead>Bill Value (Pre GST)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.variableBills?.length ? (
                                    amc.variableBills.map((b, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/30">
                                            <TableCell>{fmtBillDate(b.date || b.label)}</TableCell>
                                            <TableCell>
                                                {b.amount != null ? b.amount : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-sm text-muted-foreground py-4"
                                        >
                                            No variable bills recorded.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── 2b. Service Schedule ─────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Wrench className="h-4 w-4" />}>
                    Service Schedule (Visit-wise)
                </SectionTitle>

                {!amc.services?.length ? (
                    <p className="text-sm text-muted-foreground">
                        No service schedule generated yet.
                    </p>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Service No.</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Site</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Completed Date</TableHead>
                                    <TableHead>Filled Report</TableHead>
                                    <TableHead>Signed Report</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.services.map(service => (
                                    <TableRow key={service.id} className="hover:bg-muted/30">
                                        <TableCell>{service.serviceNo}</TableCell>
                                        <TableCell>{fmtDate(service.serviceDueDate)}</TableCell>
                                        <TableCell>
                                            {amc.sites.find(s => s.id === service.amcSiteId)?.name ?? "—"}
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell>
                                            {service.serviceCompletedDate
                                                ? fmtDateTime(service.serviceCompletedDate)
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {service.filledReport ? (
                                                <a
                                                    href={serviceFileUrl(service.filledReport)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> Open
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {service.signedReport ? (
                                                <a
                                                    href={serviceFileUrl(service.signedReport)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> Open
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── 3. Site Details ─────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<MapPin className="h-4 w-4" />}>
                    Site Details
                </SectionTitle>

                {amc.sites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sites added.</p>
                ) : (
                    <div className="space-y-4">
                        {amc.sites.map((site, idx) => (
                            <div key={idx} className="rounded-lg border overflow-hidden">
                                {/* Site info rows */}
                                <Table>
                                    <TableBody>
                                        <SectionRow>Site {idx + 1}</SectionRow>
                                        <TableRow className="hover:bg-muted/30">
                                            <InfoCell label="Site Name" value={site.name} />
                                            <InfoCell label="Site Address" value={site.address} />
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30">
                                            <InfoCell
                                                label="Site Location"
                                                value={
                                                    site.mapLink ? (
                                                        <a
                                                            href={site.mapLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Open Location
                                                        </a>
                                                    ) : null
                                                }
                                            />
                                            <InfoCell
                                                label="Status"
                                                value={
                                                    <Badge className="capitalize bg-amber-100 text-amber-800 border-transparent">
                                                        {site.status ?? "Pending"}
                                                    </Badge>
                                                }
                                            />
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                {/* Contacts sub-table */}
                                {site.contacts.length > 0 && (
                                    <div className="border-t">
                                        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                                            Site Contacts
                                        </p>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/20">
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Organization</TableHead>
                                                    <TableHead>Mobile</TableHead>
                                                    <TableHead>Email</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {site.contacts.map((c, i) => (
                                                    <TableRow key={i} className="hover:bg-muted/30">
                                                        <TableCell>{c.name}</TableCell>
                                                        <TableCell>{c.organization || "—"}</TableCell>
                                                        <TableCell>{c.mobile}</TableCell>
                                                        <TableCell>{c.email || "—"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── 4. Service Engineers ────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Wrench className="h-4 w-4" />}>
                    Service Engineers
                </SectionTitle>

                {amc.serviceEngineers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No engineers assigned.</p>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.serviceEngineers.map((e, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30">
                                        <TableCell>{e.name}</TableCell>
                                        <TableCell>{e.organization || "—"}</TableCell>
                                        <TableCell>{e.mobile}</TableCell>
                                        <TableCell>{e.email || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── 5. Products ─────────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Package className="h-4 w-4" />}>
                    Products under AMC
                </SectionTitle>

                {amc.products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No products added.</p>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Item</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Make</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Serial Nos.</TableHead>
                                    <TableHead>Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.products.map((p, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30">
                                        <TableCell>{itemName(p.itemId)}</TableCell>
                                        <TableCell>{p.description || "—"}</TableCell>
                                        <TableCell>{p.make || "—"}</TableCell>
                                        <TableCell>{p.model || "—"}</TableCell>
                                        <TableCell>{p.serialNo || "—"}</TableCell>
                                        <TableCell>{p.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── 6. Documents ────────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Documents
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { label: "Service Report Format (Sample)", path: fileUrl(sampleReport(amc.serviceReportPath)) },
                        { label: "Filled Service Report", path: fileUrl(filledReport(amc.serviceReportPath)) },
                        { label: "AMC PO", path: fileUrl(amc.amcPoPath) },
                        { label: "Signed Service Report", path: fileUrl(amc.signedServiceReportPath) },
                    ].map(({ label, path }) => (
                        <div
                            key={label}
                            className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/10"
                        >
                            <FileDownload label={label} path={path} />
                        </div>
                    ))}
                </div>
            </div>

        </Card>
    );
}