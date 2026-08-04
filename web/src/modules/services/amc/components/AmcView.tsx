import type { ReactNode } from "react";
import { ExternalLink, MapPin, Package, Wrench, FileText, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useItems } from "@/hooks/api/useItems";
import type { AmcDetail } from "../helpers/amc.types";

const fileUrl = (name?: string | null) => (name ? `/uploads/amc/${name}` : "");

function fmtDate(v?: string | null) {
    if (!v) return "—";
    try {
        return format(new Date(v), "PP");
    } catch {
        return v;
    }
}

function SectionRow({ children }: { children: ReactNode }) {
    return (
        <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-sm">{children}</TableCell>
        </TableRow>
    );
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
    return (
        <>
            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">{label}</TableCell>
            <TableCell className="text-sm font-semibold w-1/4">{value ?? "—"}</TableCell>
        </>
    );
}

export function AmcView({ amc }: { amc: AmcDetail }) {
    const { data: projects = [] } = useProjectsMaster();
    const { data: items = [] } = useItems();

    const project = projects.find(p => p.id === amc.projectId);
    const itemName = (id: number) => items.find(i => i.id === id)?.name || `Item ${id}`;

    return (
        <div className="space-y-6">
            {/* Main details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" /> AMC / Warranty Service
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <SectionRow>Basic Information</SectionRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <InfoCell label="Team Name" value={amc.teamName} />
                                <InfoCell label="Project" value={project?.projectName || amc.projectId} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <InfoCell label="Service Frequency" value={amc.serviceFrequency} />
                                <InfoCell label="Bill Frequency" value={amc.billFrequency} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <InfoCell label="AMC Start Date" value={fmtDate(amc.amcStartDate)} />
                                <InfoCell label="AMC End Date" value={fmtDate(amc.amcEndDate)} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <InfoCell label="Next Service Due" value={fmtDate(amc.nextServiceDue)} />
                                <InfoCell
                                    label="Bill Type"
                                    value={<Badge variant="outline">{amc.billType === "variable" ? "Variable" : "Constant"}</Badge>}
                                />
                            </TableRow>
                            <SectionRow>Billing Information</SectionRow>
                            {amc.billType === "constant" && (
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <InfoCell label="Bill Value" value={amc.billValue} />
                                    <TableCell className="w-1/4" />
                                    <TableCell className="w-1/4" />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {amc.billType === "variable" && (
                        <div className="mt-4">
                            <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                                <BadgeDollarSign className="h-4 w-4" /> Variable Bills (quarterly)
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill Date / Quarter</TableHead>
                                        <TableHead>Bill Value (Pre GST)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(amc.variableBills || []).map((b, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{b.label || "—"}</TableCell>
                                            <TableCell>{b.amount != null ? b.amount : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!amc.variableBills || amc.variableBills.length === 0) && (
                                        <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No variable bills</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sites */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Sites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {amc.sites.length === 0 && <p className="text-sm text-muted-foreground">No sites added.</p>}
                    {amc.sites.map((site, idx) => (
                        <div key={idx} className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="font-medium">{site.name}</p>
                                {site.mapLink && (
                                    <a href={site.mapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                        <ExternalLink className="h-3 w-3" /> Location
                                    </a>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">{site.address}</p>
                            {site.contacts.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Mobile</TableHead>
                                            <TableHead>Email</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {site.contacts.map((c, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{c.name}</TableCell>
                                                <TableCell>{c.organization || "—"}</TableCell>
                                                <TableCell>{c.mobile}</TableCell>
                                                <TableCell>{c.email || "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Service engineers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Service Engineers</CardTitle>
                </CardHeader>
                <CardContent>
                    {amc.serviceEngineers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No engineers assigned.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amc.serviceEngineers.map((e, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{e.name}</TableCell>
                                        <TableCell>{e.organization || "—"}</TableCell>
                                        <TableCell>{e.mobile}</TableCell>
                                        <TableCell>{e.email || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Products under AMC</CardTitle>
                </CardHeader>
                <CardContent>
                    {amc.products.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No products added.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
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
                                    <TableRow key={idx}>
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
                    )}
                </CardContent>
            </Card>

            {/* Files */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Documents</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <FileDownload label="Service Report Format" path={fileUrl(amc.serviceReportPath)} />
                    <FileDownload label="AMC PO" path={fileUrl(amc.amcPoPath)} />
                    <FileDownload label="Signed Service Report" path={fileUrl(amc.signedServiceReportPath)} />
                </CardContent>
            </Card>
        </div>
    );
}

function FileDownload({ label, path }: { label: string; path: string }) {
    if (!path) {
        return <span className="text-sm text-muted-foreground">{label}: <Badge variant="outline">No file</Badge></span>;
    }
    return (
        <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <FileText className="h-3.5 w-3.5" /> {label}
        </a>
    );
}