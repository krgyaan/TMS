import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, ExternalLink, Download, Calendar, Hash, Building2, Users, Clock, FileCheck, TrendingUp, CheckCircle2, XCircle, Pause, Play, Phone, Mail, User, Briefcase } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { WoBasicDetail, WorkflowStage } from '../helpers/basiDetail.types';
import type { WoContact } from '../../types/wo.types';

interface BasicDetailViewProps {
    data: WoBasicDetail;
    contacts?: WoContact[];
    isLoading?: boolean;
    className?: string;
}

// Helper function to get file URL from stored path
const getFileUrl = (filePath: string): string => {
    const parts = filePath.split('/');
    if (parts.length >= 2) {
        const context = parts[0];
        const fileName = parts.slice(1).join('/');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
    }
    return filePath;
};

// Parse woDraft which can be string, array, or null
const parseWoDraft = (woDraft: string | string[] | null | undefined): string[] => {
    if (!woDraft) return [];
    if (Array.isArray(woDraft)) return woDraft.filter(Boolean);
    // Handle comma-separated string or single path
    return woDraft.split(',').map(s => s.trim()).filter(Boolean);
};

// Get margin color variant
const getMarginVariant = (margin: number): string => {
    if (margin >= 20) return 'success';
    if (margin >= 10) return 'info';
    if (margin >= 0) return 'warning';
    return 'destructive';
};

// Stage configuration for progress display
const STAGES: { key: WorkflowStage; label: string }[] = [
    { key: 'basic_details', label: 'Basic Details' },
    { key: 'wo_details', label: 'WO Details' },
    { key: 'wo_acceptance', label: 'WO Acceptance' },
    { key: 'wo_upload', label: 'WO Upload' },
    { key: 'completed', label: 'Completed' },
];

const getStageIndex = (stage: WorkflowStage | null | undefined): number => {
    if (!stage) return 0;
    const index = STAGES.findIndex((s) => s.key === stage);
    return index >= 0 ? index : 0;
};

const getStageProgress = (stage: WorkflowStage | null | undefined): number => {
    const index = getStageIndex(stage);
    return ((index + 1) / STAGES.length) * 100;
};

const getStageVariant = (stage: WorkflowStage | null | undefined): string => {
    switch (stage) {
        case 'completed':
            return 'success';
        case 'wo_upload':
        case 'wo_acceptance':
            return 'info';
        case 'wo_details':
        case 'basic_details':
            return 'warning';
        default:
            return 'secondary';
    }
};

export interface OeAssignmentData {
    userId: number;
    userName?: string;
    assignedAt?: string | null;
    assignedByUserId?: number | null;
    assignedByName?: string;
}

const isOeAssignmentData = (value: number | OeAssignmentData | null | undefined): value is OeAssignmentData => {
    return typeof value === 'object' && value !== null && 'userId' in value;
};

// TMS Documents list (same as form)
const TMS_DOC_LIST = [
    "Complete Tender Documents",
    "Tender Info",
    "EMD Information",
    "Physical documents submission",
    "RFQ and Quotation",
    "Document Checklist",
    "Costing Sheet",
    "TQ",
    "RA and Result details",
];

export function BasicDetailView({
    data,
    contacts = [],
    isLoading = false,
    className = '',
}: BasicDetailViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasOeAssignments = data.oeFirst || data.oeSiteVisit || data.oeDocsPrep;
    const hasTmsDocuments = data.tmsDocuments && Object.keys(data.tmsDocuments).length > 0;
    const hasContacts = contacts && contacts.length > 0;
    const hasWorkflowPauseInfo = data.isWorkflowPaused || data.workflowPausedAt || data.workflowResumedAt;

    const grossMarginValue = data.grossMargin ? parseFloat(String(data.grossMargin)) : null;
    const woDraftFiles = parseWoDraft(data.woDraft);

    // Calculate TMS documents completion stats
    const tmsDocsComplete = hasTmsDocuments
        ? Object.values(data.tmsDocuments!).filter(Boolean).length
        : 0;
    const tmsDocsTotal = hasTmsDocuments ? Object.keys(data.tmsDocuments!).length : TMS_DOC_LIST.length;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Work Order Basic Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Workflow Progress */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                            Workflow Progress
                        </span>
                        <div className="flex items-center gap-2">
                            {data.isWorkflowPaused && (
                                <Badge variant="secondary" className="gap-1">
                                    <Pause className="h-3 w-3" />
                                    Paused
                                </Badge>
                            )}
                            <Badge variant={getStageVariant(data.currentStage) as any}>
                                {STAGES.find((s) => s.key === data.currentStage)?.label || 'Not Started'}
                            </Badge>
                        </div>
                    </div>
                    <Progress value={getStageProgress(data.currentStage)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        {STAGES.map((stage, index) => {
                            const currentIndex = getStageIndex(data.currentStage);
                            const isCompleted = index < currentIndex;
                            const isCurrent = index === currentIndex;
                            return (
                                <span
                                    key={stage.key}
                                    className={`${isCurrent ? 'font-semibold text-primary' : ''} ${isCompleted ? 'text-green-600' : ''}`}
                                >
                                    {stage.label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <Table>
                    <TableBody>
                        {/* Work Order Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4" />
                                    Work Order Information
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                WO Number
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.woNumber || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                WO Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.woDate ? (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {formatDateTime(data.woDate)}
                                    </div>
                                ) : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Project Code
                            </TableCell>
                            <TableCell className="text-sm font-mono font-semibold text-primary">
                                {data.projectCode || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Project Name
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.projectName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Financial Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Financial Details
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                WO Value (Pre-GST)
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.woValuePreGst
                                    ? formatINR(parseFloat(String(data.woValuePreGst)))
                                    : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                GST Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.woValueGstAmt
                                    ? formatINR(parseFloat(String(data.woValueGstAmt)))
                                    : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Receipt (Pre-GST)
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.receiptPreGst
                                    ? formatINR(parseFloat(String(data.receiptPreGst)))
                                    : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Budget (Pre-GST)
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.budgetPreGst
                                    ? formatINR(parseFloat(String(data.budgetPreGst)))
                                    : '—'}
                            </TableCell>
                        </TableRow>
                        {grossMarginValue !== null && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Gross Margin
                                </TableCell>
                                <TableCell colSpan={3}>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getMarginVariant(grossMarginValue) as any} className="font-bold">
                                            {grossMarginValue.toFixed(2)}%
                                        </Badge>
                                        <span className="text-[8px] text-muted-foreground">
                                            ((Receipt - Budget) / Receipt) × 100
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Operations Executive Assignments */}
                        {hasOeAssignments && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Operations Executive Assignments
                                        </div>
                                    </TableCell>
                                </TableRow>
                                {data.oeFirst && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Primary OE
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {isOeAssignmentData(data.oeFirst) ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">
                                                        {data.oeFirst.userName || `User #${data.oeFirst.userId}`}
                                                    </span>
                                                    {data.oeFirst.assignedAt && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Assigned: {formatDateTime(data.oeFirst.assignedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-semibold">User #{data.oeFirst}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Assigned At
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {data.oeFirstAssignedAt ? formatDateTime(data.oeFirstAssignedAt) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.oeSiteVisit && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Site Visit OE
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {isOeAssignmentData(data.oeSiteVisit) ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">
                                                        {data.oeSiteVisit.userName || `User #${data.oeSiteVisit.userId}`}
                                                    </span>
                                                    {data.oeSiteVisit.assignedAt && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Assigned: {formatDateTime(data.oeSiteVisit.assignedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-semibold">User #{data.oeSiteVisit}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Assigned At
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {data.oeSiteVisitAssignedAt ? formatDateTime(data.oeSiteVisitAssignedAt) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.oeDocsPrep && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Documents Prep OE
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {isOeAssignmentData(data.oeDocsPrep) ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold">
                                                        {data.oeDocsPrep.userName || `User #${data.oeDocsPrep.userId}`}
                                                    </span>
                                                    {data.oeDocsPrep.assignedAt && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Assigned: {formatDateTime(data.oeDocsPrep.assignedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-semibold">User #{data.oeDocsPrep}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Assigned At
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {data.oeDocsPrepAssignedAt ? formatDateTime(data.oeDocsPrepAssignedAt) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Workflow Pause Status */}
                        {hasWorkflowPauseInfo && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            {data.isWorkflowPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            Workflow Status
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell>
                                        {data.isWorkflowPaused ? (
                                            <Badge variant="secondary" className="gap-1">
                                                <Pause className="h-3 w-3" />
                                                Paused (PO Amendment)
                                            </Badge>
                                        ) : (
                                            <Badge variant="success" className="gap-1">
                                                <Play className="h-3 w-3" />
                                                Active
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        {data.workflowPausedAt ? 'Paused At' : 'Resumed At'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.workflowPausedAt
                                            ? formatDateTime(data.workflowPausedAt)
                                            : data.workflowResumedAt
                                                ? formatDateTime(data.workflowResumedAt)
                                                : '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Audit Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Audit Information
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.createdAt ? formatDateTime(data.createdAt) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.updatedAt ? formatDateTime(data.updatedAt) : '—'}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                {/* TMS Documents Checklist */}
                {hasTmsDocuments && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <FileCheck className="h-4 w-4" />
                                TMS Documents Checklist
                            </div>
                            <Badge variant={tmsDocsComplete === tmsDocsTotal ? 'success' : 'secondary'}>
                                {tmsDocsComplete} / {tmsDocsTotal} Complete
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {TMS_DOC_LIST.map((docName) => {
                                const isChecked = data.tmsDocuments?.[docName] ?? false;
                                return (
                                    <div
                                        key={docName}
                                        className="flex items-center justify-between border rounded-md p-3 bg-card"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isChecked ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{docName}</span>
                                        </div>
                                        <Badge
                                            variant={isChecked ? 'success' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {isChecked ? 'Complete' : 'Pending'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Contact Details */}
                {hasContacts && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Users className="h-4 w-4" />
                            Contact Details
                            <Badge variant="outline" className="ml-2">
                                {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {contacts.map((contact, idx) => (
                                <div
                                    key={contact.id || idx}
                                    className="border rounded-lg p-4 bg-card space-y-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{contact.name || '—'}</span>
                                    </div>
                                    {contact.designation && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Briefcase className="h-3 w-3" />
                                            {contact.designation}
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            <a
                                                href={`tel:${contact.phone}`}
                                                className="text-primary hover:underline"
                                            >
                                                {contact.phone}
                                            </a>
                                        </div>
                                    )}
                                    {contact.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            <a
                                                href={`mailto:${contact.email}`}
                                                className="text-primary hover:underline"
                                            >
                                                {contact.email}
                                            </a>
                                        </div>
                                    )}
                                    {(contact.organization || contact.departments) && (
                                        <div className="text-xs text-muted-foreground pt-1 border-t">
                                            {[contact.organization, contact.departments]
                                                .filter(Boolean)
                                                .join(' • ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* WO Draft Documents */}
                {woDraftFiles.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <FileText className="h-4 w-4" />
                            WO Draft Document{woDraftFiles.length > 1 ? 's' : ''}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {woDraftFiles.map((filePath, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col border rounded-md p-4 bg-card shadow-sm gap-3"
                                >
                                    <div className="flex items-start gap-3 overflow-hidden">
                                        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span
                                                className="font-medium text-sm truncate"
                                                title={filePath.split('/').pop() || filePath}
                                            >
                                                {filePath.split('/').pop() || filePath}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                LOA / GEM PO / LOI / Draft WO
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-9 text-sm gap-2"
                                            onClick={() => window.open(getFileUrl(filePath), '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-9 text-sm gap-2"
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = getFileUrl(filePath);
                                                a.download = filePath.split('/').pop() || filePath;
                                                a.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default BasicDetailView;
