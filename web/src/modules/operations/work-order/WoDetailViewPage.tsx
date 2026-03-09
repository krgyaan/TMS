// src/pages/wo-details/WODetailsView.tsx

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import { ChevronDown, ChevronRight, FileText, ExternalLink, Users, Calendar, IndianRupee, Clock, FileCheck, AlertCircle } from "lucide-react";

/* ================================
   TYPES
================================ */
interface ClientContact {
    department: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
}

interface RFQDocument {
    id: number;
    rfq_no: string;
    scopes: { file_path: string }[];
    technicals: { file_path: string }[];
    boqs: { file_path: string }[];
    mafs: { file_path: string }[];
    miis: { file_path: string }[];
    mii_vendor: { file_path: string }[];
    docs_list: string | null;
}

interface WOData {
    tender_id: number | null;
    tender_name: string;
    wo_number: string;
    wo_date: string;
    wo_value_pre_gst: number;
    wo_value_gst: number;
    budget: number;
    max_ld_percent: number;
    ld_start_date: string;
    max_ld_date: string;
    supply_days: number;
    installation_days: number;
    pt_supply: number;
    pt_ic: number;
    costing_sheet_link: string | null;
    clients: ClientContact[];
    documents: {
        foa_sap: string | null;
        original_loa: string | null;
        contract_agreement: string | null;
        filled_bg: string | null;
    };
    rfqs: RFQDocument[];
}

interface WODetailsViewProps {
    data: WOData | null;
    defaultOpen?: boolean;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_WO_DATA: WOData = {
    tender_id: 101,
    tender_name: "Smart City Infrastructure Development - Phase 1",
    wo_number: "WO/2024/SC/001",
    wo_date: "2024-12-01",
    wo_value_pre_gst: 38500000,
    wo_value_gst: 6930000,
    budget: 32000000,
    max_ld_percent: 10,
    ld_start_date: "2025-06-15",
    max_ld_date: "2025-07-15",
    supply_days: 60,
    installation_days: 30,
    pt_supply: 80,
    pt_ic: 20,
    costing_sheet_link: "https://drive.google.com/sheet/xyz",
    clients: [
        { department: "EIC", name: "Rajesh Kumar", designation: "Chief Engineer", phone: "9876543210", email: "rajesh.kumar@org.gov.in" },
        { department: "User", name: "Priya Sharma", designation: "Project Manager", phone: "9876543211", email: "priya.sharma@org.gov.in" },
        { department: "C&P", name: "Amit Patel", designation: "Sr. Manager", phone: "9876543212", email: "amit.patel@org.gov.in" },
        { department: "Finance", name: "Sneha Gupta", designation: "Finance Head", phone: "9876543213", email: "sneha.gupta@org.gov.in" },
    ],
    documents: {
        foa_sap: "foa_sap_001.pdf",
        original_loa: "loa_001.pdf",
        contract_agreement: "contract_001.pdf",
        filled_bg: "bg_format_001.pdf",
    },
    rfqs: [
        {
            id: 1,
            rfq_no: "RFQ-2024-001",
            scopes: [{ file_path: "scope_001.pdf" }, { file_path: "scope_002.pdf" }],
            technicals: [{ file_path: "tech_spec_001.pdf" }],
            boqs: [{ file_path: "boq_001.xlsx" }],
            mafs: [{ file_path: "maf_001.pdf" }],
            miis: [{ file_path: "mii_001.pdf" }],
            mii_vendor: [],
            docs_list: "Certificate of Incorporation, ISO Certificate",
        },
        {
            id: 2,
            rfq_no: "RFQ-2024-002",
            scopes: [{ file_path: "scope_003.pdf" }],
            technicals: [],
            boqs: [{ file_path: "boq_002.xlsx" }],
            mafs: [],
            miis: [{ file_path: "mii_002.pdf" }],
            mii_vendor: [{ file_path: "mii_vendor_001.pdf" }],
            docs_list: null,
        },
    ],
};

/* ================================
   HELPERS
================================ */
const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatCurrency = (amount: number | null): string => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

/* ================================
   DOCUMENT LINK COMPONENT
================================ */
interface DocumentLinkProps {
    file: string | null | undefined;
    basePath: string;
    notFoundText?: string;
}

const DocumentLink: React.FC<DocumentLinkProps> = () => {
    let file = null;
    let basePath = null;
    let notFoundText = "No Document Found";
    if (!file) {
        return <span className="text-muted-foreground text-sm">{notFoundText}</span>;
    }

    return (
        <a href={`${basePath}/${file}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" />
            View Document
            <ExternalLink className="h-3 w-3" />
        </a>
    );
};

/* ================================
   FILE LIST COMPONENT
================================ */
interface FileListProps {
    files: { file_path: string }[];
    basePath: string;
}

const FileList: React.FC = () => {
    let files = [];
    let basePath = "";

    if (!files || files.length === 0) {
        return <span className="text-muted-foreground text-xs">No Files</span>;
    }

    return (
        <div className="space-y-1">
            {files.map((file, index) => (
                <a
                    key={index}
                    href={`${basePath}/${file.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-primary hover:underline truncate"
                    title={file.file_path}
                >
                    {index + 1}. {file.file_path}
                </a>
            ))}
        </div>
    );
};

/* ================================
   INFO ROW COMPONENT
================================ */
interface InfoRowProps {
    label: string;
    value: React.ReactNode;
    className?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, className }) => (
    <div className={className}>
        <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</dt>
        <dd className="text-sm font-medium">{value}</dd>
    </div>
);

/* ================================
   SECTION HEADER COMPONENT
================================ */
interface SectionHeaderProps {
    title: string;
    icon?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
    <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md mb-3">
        {icon}
        <span className="text-sm font-semibold uppercase tracking-wide">{title}</span>
    </div>
);

/* ================================
   MAIN COMPONENT
================================ */
const WoDetailViewPage: React.FC<WODetailsViewProps> = ({ data = DUMMY_WO_DATA, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!data) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        <span>Work Order Details Not Filled</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="font-semibold">Work Order Details</span>
                    {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <Card className="mt-2 border-t-0 rounded-t-none">
                    <CardContent className="p-6 space-y-6">
                        {/* FOA/SAP Document */}
                        <div className="p-3 border rounded-md bg-muted/20">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">FOA/SAP PO/Detailed WO</span>
                                <DocumentLink file={data.documents.foa_sap} basePath="/uploads/basicdetails" />
                            </div>
                        </div>

                        {/* Project Summary */}
                        {data.tender_id && (
                            <>
                                <SectionHeader title="Project Summary Sheet" icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                                    <InfoRow label="Project Name" value={data.tender_name} />
                                    <InfoRow label="WO No. / GEM Contract No." value={<span className="font-mono">{data.wo_number}</span>} />
                                    <InfoRow label="WO Date" value={formatDate(data.wo_date)} />
                                </div>
                            </>
                        )}

                        {/* Client Details */}
                        {data.clients && data.clients.length > 0 && (
                            <>
                                <SectionHeader title="Client Details" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-10">#</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Designation</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Email</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.clients.map((client, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{client.department}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{client.name}</TableCell>
                                                    <TableCell>{client.designation}</TableCell>
                                                    <TableCell className="font-mono text-sm">{client.phone}</TableCell>
                                                    <TableCell className="text-sm">{client.email}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}

                        {/* WO Details */}
                        <SectionHeader title="WO Details" icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md">
                            <InfoRow label="WO Value (Pre GST)" value={formatCurrency(data.wo_value_pre_gst)} />
                            <InfoRow label="WO Value (GST Amount)" value={formatCurrency(data.wo_value_gst)} />
                            <InfoRow label="Budget" value={formatCurrency(data.budget)} />
                        </div>

                        {/* Completion Period */}
                        {data.tender_id && (
                            <>
                                <SectionHeader title="Completion Period" icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md">
                                    <InfoRow label="Total Days" value={`${data.supply_days + data.installation_days} days`} />
                                    <InfoRow label="Supply" value={`${data.supply_days} days`} />
                                    <InfoRow label="I&C" value={`${data.installation_days} days`} />
                                </div>
                            </>
                        )}

                        {/* LD & Payment Details */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md">
                            <InfoRow label="Max LD%" value={`${data.max_ld_percent}%`} />
                            <InfoRow label="LD Start Date" value={formatDate(data.ld_start_date)} />
                            <InfoRow label="Max LD Date" value={formatDate(data.max_ld_date)} />
                            {data.tender_id && (
                                <>
                                    <InfoRow label="Payment Terms (Supply)" value={`${data.pt_supply}%`} />
                                    <InfoRow label="Payment Terms (I&C)" value={`${data.pt_ic}%`} />
                                    <InfoRow
                                        label="Costing Sheet"
                                        value={
                                            data.costing_sheet_link ? (
                                                <a
                                                    href={data.costing_sheet_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                >
                                                    Open Sheet
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )
                                        }
                                    />
                                </>
                            )}
                        </div>

                        {/* WO Documents */}
                        <SectionHeader title="WO Documents" icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
                        <div className="border rounded-md divide-y">
                            <div className="flex items-center justify-between p-3">
                                <span className="text-sm">Original LOA/GEM PO/LOI/Draft PO</span>
                                <DocumentLink file={data.documents.original_loa} basePath="/uploads/basicdetails" />
                            </div>
                            <div className="flex items-center justify-between p-3">
                                <span className="text-sm">Contract Agreement Format</span>
                                <DocumentLink file={data.documents.contract_agreement} basePath="/uploads/applicable" notFoundText="Not Applicable" />
                            </div>
                            <div className="flex items-center justify-between p-3">
                                <span className="text-sm">Filled BG Format</span>
                                <DocumentLink file={data.documents.filled_bg} basePath="/uploads/applicable" />
                            </div>
                        </div>

                        {/* RFQ Documents Table */}
                        {data.tender_id && data.rfqs && data.rfqs.length > 0 && (
                            <>
                                <SectionHeader title="RFQ Documents" />
                                <div className="border rounded-md overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-10">#</TableHead>
                                                <TableHead className="min-w-[120px]">RFQ Reference</TableHead>
                                                <TableHead className="min-w-[100px]">Scope of Work</TableHead>
                                                <TableHead className="min-w-[100px]">Tech Specs</TableHead>
                                                <TableHead className="min-w-[100px]">Detailed BOQ</TableHead>
                                                <TableHead className="min-w-[100px]">MAF Format</TableHead>
                                                <TableHead className="min-w-[100px]">MAF from Vendor</TableHead>
                                                <TableHead className="min-w-[100px]">MII Format</TableHead>
                                                <TableHead className="min-w-[100px]">MII from Vendor</TableHead>
                                                <TableHead className="min-w-[150px]">OEM Documents</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.rfqs.map((rfq, index) => (
                                                <TableRow key={rfq.id}>
                                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell className="font-mono text-sm">{rfq.rfq_no}</TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.scopes} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.technicals} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.boqs} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.scopes} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.mafs} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.miis} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileList files={rfq.mii_vendor} basePath="/uploads/rfqdocs" />
                                                    </TableCell>
                                                    <TableCell className="text-xs">{rfq.docs_list || <span className="text-muted-foreground">—</span>}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}

                        {/* Empty RFQ State */}
                        {data.tender_id && (!data.rfqs || data.rfqs.length === 0) && (
                            <>
                                <SectionHeader title="RFQ Documents" />
                                <div className="p-6 border rounded-md text-center text-muted-foreground">No RFQ Documents Available</div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default WoDetailViewPage;
