import React, { useState, useMemo } from 'react';
import {
    FileText,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    Search,
    Info,
    X,
    Layers,
    HelpCircle,
    ExternalLink,
    Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fileUploadService } from '@/services/api/file-upload.service';
import { parseTenderDocuments } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import type { ExtractedField } from '../helpers/tenderInfoSheet.autoExtract';

export interface ExtractionPreviewPanelProps {
    fields?: Record<string, ExtractedField> | null;
    selfClassifiedAtc?: boolean;
    hasAtc?: boolean;
    missingFields?: string[];
    processingTimeMs?: number;
    tenderDocuments?: string | null;
    mainTenderPath?: string | null;
    atcPath?: string | null;
    onClose?: () => void;
}

type ViewMode = 'all' | 'main' | 'atc' | 'conflicts';

interface FieldMeta {
    label: string;
    category: 'basic' | 'terms' | 'delivery' | 'security' | 'financial' | 'contacts';
}

const FIELD_METADATA: Record<string, FieldMeta> = {
    // Basic & Fees
    tenderValue: { label: 'Estimated Tender Value', category: 'basic' },
    emdRequired: { label: 'EMD Required', category: 'basic' },
    emdAmount: { label: 'EMD Amount', category: 'basic' },
    emdModes: { label: 'EMD Payment Modes', category: 'basic' },
    tenderFeeRequired: { label: 'Tender Fee Required', category: 'basic' },
    tenderFeeAmount: { label: 'Tender Fee Amount', category: 'basic' },
    tenderFeeModes: { label: 'Tender Fee Modes', category: 'basic' },
    processingFeeRequired: { label: 'Processing Fee Required', category: 'basic' },
    processingFeeAmount: { label: 'Processing Fee Amount', category: 'basic' },
    processingFeeModes: { label: 'Processing Fee Modes', category: 'basic' },

    // Evaluation & Terms
    bidValidityDays: { label: 'Bid Validity (Days)', category: 'terms' },
    commercialEvaluation: { label: 'Commercial Evaluation Method', category: 'terms' },
    reverseAuctionApplicable: { label: 'Reverse Auction Applicable', category: 'terms' },
    mafRequired: { label: 'Manufacturer Authorization (MAF)', category: 'terms' },
    paymentTermsSupply: { label: 'Payment Terms (Supply)', category: 'terms' },
    paymentTermsInstallation: { label: 'Payment Terms (Installation)', category: 'terms' },

    // Delivery Schedule
    deliveryTimeSupply: { label: 'Delivery Time (Supply)', category: 'delivery' },
    deliveryTimeInstallationDays: { label: 'Delivery Time (Installation)', category: 'delivery' },
    deliveryTimeInstallationInclusive: { label: 'Installation Inclusive in Supply Period', category: 'delivery' },

    // PBG & SD
    pbgRequired: { label: 'PBG Required', category: 'security' },
    pbgPercentage: { label: 'PBG Percentage (%)', category: 'security' },
    pbgDurationMonths: { label: 'PBG Duration (Months)', category: 'security' },
    pbgMode: { label: 'PBG Mode / Form', category: 'security' },
    sdRequired: { label: 'Security Deposit Required', category: 'security' },
    sdPercentage: { label: 'Security Deposit (%)', category: 'security' },
    sdDurationMonths: { label: 'SD Duration (Months)', category: 'security' },
    sdMode: { label: 'SD Mode / Form', category: 'security' },
    ldPercentagePerWeek: { label: 'LD / PRS Percentage per Week', category: 'security' },
    maxLdPercentage: { label: 'Maximum LD / PRS Cap (%)', category: 'security' },
    physicalDocsRequired: { label: 'Physical Documents Required', category: 'security' },
    physicalDocsDeadline: { label: 'Physical Documents Deadline', category: 'security' },

    // Financial & Technical BEC
    orderValue1: { label: 'Past Order Value 1 (Single Order)', category: 'financial' },
    orderValue2: { label: 'Past Order Value 2 (Two Orders)', category: 'financial' },
    orderValue3: { label: 'Past Order Value 3 (Three Orders)', category: 'financial' },
    techEligibilityAge: { label: 'Experience Criterion (Years)', category: 'financial' },
    avgAnnualTurnoverType: { label: 'Average Annual Turnover Type', category: 'financial' },
    avgAnnualTurnoverValue: { label: 'Average Annual Turnover Value', category: 'financial' },
    workingCapitalType: { label: 'Working Capital Type', category: 'financial' },
    workingCapitalValue: { label: 'Working Capital Value', category: 'financial' },
    netWorthType: { label: 'Net Worth Type', category: 'financial' },
    netWorthValue: { label: 'Net Worth Value', category: 'financial' },
    solvencyCertificateType: { label: 'Solvency Certificate Type', category: 'financial' },
    solvencyCertificateValue: { label: 'Solvency Certificate Value', category: 'financial' },
    customEligibilityCriteria: { label: 'Custom BEC / Eligibility Criteria', category: 'financial' },

    // Contacts & Addresses
    clients: { label: 'Client / Buyer Contact Details', category: 'contacts' },
    courierAddress: { label: 'Courier / Dealing Office Address', category: 'contacts' },
};

function formatDisplayValue(val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) {
        if (val.length === 0) return 'None';
        if (typeof val[0] === 'object') {
            return val.map((item) => JSON.stringify(item)).join('; ');
        }
        return val.join(', ');
    }
    if (typeof val === 'number') {
        return Number.isInteger(val) ? val.toLocaleString('en-IN') : val.toString();
    }
    return String(val);
}

export const ExtractionPreviewPanel: React.FC<ExtractionPreviewPanelProps> = ({
    fields,
    selfClassifiedAtc = false,
    hasAtc = false,
    missingFields = [],
    processingTimeMs,
    tenderDocuments,
    mainTenderPath,
    atcPath,
    onClose,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});

    const toggleSnippet = (key: string) => {
        setExpandedSnippets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Parse and resolve tender document paths
    const structuredDocs = useMemo(() => {
        return parseTenderDocuments(tenderDocuments);
    }, [tenderDocuments]);

    const resolvedMainPath = mainTenderPath || structuredDocs.mainTender;
    const resolvedAtcPath = atcPath || (structuredDocs.atc && structuredDocs.atc.length > 0 ? structuredDocs.atc[0] : null);

    // If self_classified_atc, fallback to whichever single document exists
    const singleAtcDocPath = selfClassifiedAtc
        ? (resolvedAtcPath || resolvedMainPath || (structuredDocs.otherDocuments && structuredDocs.otherDocuments.length > 0 ? structuredDocs.otherDocuments[0] : null))
        : null;

    const resolvePdfUrl = (rawPath: string | null | undefined): string | null => {
        if (!rawPath) return null;
        const normalized = rawPath.includes('/') ? rawPath : `tender-documents/${rawPath}`;
        return fileUploadService.getFileUrl(normalized);
    };

    const mainTenderUrl = useMemo(() => resolvePdfUrl(resolvedMainPath), [resolvedMainPath]);
    const atcUrl = useMemo(
        () => resolvePdfUrl(selfClassifiedAtc ? (singleAtcDocPath || resolvedMainPath) : resolvedAtcPath),
        [selfClassifiedAtc, singleAtcDocPath, resolvedMainPath, resolvedAtcPath]
    );

    // Viewer document selection state
    const [selectedViewerDoc, setSelectedViewerDoc] = useState<'main_tender' | 'atc'>(() => {
        if (selfClassifiedAtc || !mainTenderUrl) return 'atc';
        return 'main_tender';
    });

    const activeViewerPdfUrl = selectedViewerDoc === 'atc' ? (atcUrl || mainTenderUrl) : mainTenderUrl;

    // Collect metrics & conflicts
    const fieldEntries = useMemo(() => {
        if (!fields) return [];
        return Object.entries(fields);
    }, [fields]);

    const conflicts = useMemo(() => {
        return fieldEntries.filter(([_, f]) => f?.sources?.has_conflict);
    }, [fieldEntries]);

    const conflictCount = conflicts.length;

    // Filter fields based on viewMode, search, and category
    const filteredEntries = useMemo(() => {
        return fieldEntries.filter(([key, f]) => {
            const meta = FIELD_METADATA[key] || {
                label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
                category: 'basic',
            };

            // Category filter
            if (categoryFilter !== 'all' && meta.category !== categoryFilter) {
                return false;
            }

            // View mode filter
            if (viewMode === 'conflicts') {
                if (!f?.sources?.has_conflict) return false;
            } else if (viewMode === 'main') {
                // Only fields with a Main Tender extraction
                if (!f?.sources?.main_tender) return false;
            } else if (viewMode === 'atc') {
                // Only fields with an ATC extraction
                if (!f?.sources?.atc) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const labelMatch = meta.label.toLowerCase().includes(q);
                const keyMatch = key.toLowerCase().includes(q);
                const valMatch = formatDisplayValue(f?.value).toLowerCase().includes(q);
                const mainSnippetMatch = f?.sources?.main_tender?.snippet?.toLowerCase().includes(q);
                const atcSnippetMatch = f?.sources?.atc?.snippet?.toLowerCase().includes(q);
                if (!labelMatch && !keyMatch && !valMatch && !mainSnippetMatch && !atcSnippetMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [fieldEntries, viewMode, searchQuery, categoryFilter]);

    if (!fields || Object.keys(fields).length === 0) {
        return (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                <p className="font-medium text-slate-300">No Document Extraction Available</p>
                <p className="text-xs text-slate-500 mt-1">Run AI Auto-Extract to inspect document citations and field sources.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-sm overflow-hidden mb-6 text-slate-200">
            {/* 1. Header & Summary Bar */}
            <div className="border-b border-slate-800 bg-slate-950/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-100 text-base">Document Extraction Preview</h3>
                                <Badge variant="outline" className="text-[11px] py-0 border-indigo-500/30 text-indigo-300 bg-indigo-500/5">
                                    Read-Only
                                </Badge>
                                {processingTimeMs && (
                                    <span className="text-[11px] text-slate-500 font-mono">
                                        ({(processingTimeMs / 1000).toFixed(1)}s)
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Cross-verify extracted parameters, page citations, and discrepancies against the actual uploaded documents.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {conflictCount > 0 ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center gap-1.5 py-1 px-2.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            <span>{conflictCount} Discrepanc{conflictCount > 1 ? 'ies' : 'y'}</span>
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-1 py-1 px-2.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>No Discrepancies</span>
                        </Badge>
                    )}

                    {selfClassifiedAtc ? (
                        <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-300 py-1 px-2.5">
                            Single Upload (Self-Classified ATC)
                        </Badge>
                    ) : hasAtc ? (
                        <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-300 py-1 px-2.5">
                            Dual Document (Main + ATC)
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-300 py-1 px-2.5">
                            Main Tender Document
                        </Badge>
                    )}

                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* 2. Self-Classified Notice Banner (When Applicable) */}
            {selfClassifiedAtc && (
                <div className="border-b border-purple-500/30 bg-purple-950/20 px-4 py-3 flex items-start gap-3">
                    <Info className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-purple-200">
                        <span className="font-semibold text-purple-300">Single Document Upload:</span> This tender was parsed as a standalone Buyer ATC document without an independent Main Tender PDF. Values and citations reflect the uploaded document directly; dual-source document comparison is not applicable.
                    </div>
                </div>
            )}

            {/* 3. Split-Screen Layout: Left Fields Pane | Right Embedded PDF Viewer Pane */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-slate-800">
                {/* Left Column: Filter Controls & Scrollable Fields List */}
                <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[750px]">
                    {/* Filter Controls Bar */}
                    <div className="border-b border-slate-800 bg-slate-950/50 p-3 space-y-2.5">
                        {/* View Mode Toggle Tabs */}
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('all')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                    viewMode === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                            >
                                All ({fieldEntries.length})
                            </button>

                            {!selfClassifiedAtc && (
                                <button
                                    type="button"
                                    onClick={() => setViewMode('main')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                        viewMode === 'main'
                                            ? 'bg-sky-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                >
                                    Main Tender
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setViewMode('atc')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                    viewMode === 'atc'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                            >
                                {selfClassifiedAtc ? 'ATC Document' : 'ATC View'}
                            </button>

                            {conflictCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setViewMode('conflicts')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                                        viewMode === 'conflicts'
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                    }`}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Discrepancies ({conflictCount})
                                </button>
                            )}
                        </div>

                        {/* Search Query & Category Filter Bar */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                                <Input
                                    type="text"
                                    placeholder="Filter by field, value, or citation..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-xs"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-8 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="all">All Categories</option>
                                <option value="basic">Fees & EMD</option>
                                <option value="terms">Terms & Evaluation</option>
                                <option value="delivery">Delivery Timeline</option>
                                <option value="security">PBG, SD & LD</option>
                                <option value="financial">Financial / BEC</option>
                                <option value="contacts">Contacts & Address</option>
                            </select>
                        </div>
                    </div>

                    {/* Scrollable Fields List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
                        {filteredEntries.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                No fields match the selected filter criteria.
                            </div>
                        ) : (
                            filteredEntries.map(([key, f]) => {
                                const meta = FIELD_METADATA[key] || {
                                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
                                    category: 'basic',
                                };
                                const hasConflict = Boolean(f?.sources?.has_conflict);
                                const mainSource = f?.sources?.main_tender;
                                const atcSource = f?.sources?.atc;
                                const isLlmFallback = new Set(['orderValue1', 'netWorthType', 'netWorthValue', 'customEligibilityCriteria']).has(key);
                                const isLlmWithoutCitation = (f?.source === 'llm' || isLlmFallback) && !mainSource?.snippet && !atcSource?.snippet;
                                const isExpanded = Boolean(expandedSnippets[key]);

                                const displayedSource = viewMode === 'main'
                                    ? mainSource
                                    : viewMode === 'atc'
                                        ? atcSource
                                        : (f?.source === 'atc' ? atcSource : (mainSource || atcSource));

                                const displayedValue = viewMode === 'main' && mainSource?.value !== undefined
                                    ? mainSource.value
                                    : viewMode === 'atc' && atcSource?.value !== undefined
                                        ? atcSource.value
                                        : f?.value;

                                const showSideBySide = hasConflict && (viewMode === 'all' || viewMode === 'conflicts');

                                return (
                                    <div
                                        key={key}
                                        className={`p-3.5 transition-colors ${
                                            hasConflict
                                                ? 'bg-amber-950/15 border-l-4 border-l-amber-500'
                                                : 'hover:bg-slate-800/30'
                                        }`}
                                    >
                                        {/* Field Label & Source Badge */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-slate-200 text-xs sm:text-sm">
                                                    {meta.label}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    ({key})
                                                </span>

                                                {hasConflict && (
                                                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] py-0 px-1.5 flex items-center gap-1">
                                                        <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                                                        <span>Discrepancy</span>
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {isLlmWithoutCitation ? (
                                                    <Badge variant="outline" className="border-purple-500/30 bg-purple-950/30 text-purple-300 text-[10px] py-0.5 px-2 flex items-center gap-1">
                                                        <Sparkles className="h-3 w-3 text-purple-400" />
                                                        <span>AI-resolved</span>
                                                    </Badge>
                                                ) : viewMode === 'main' ? (
                                                    <Badge variant="outline" className="border-sky-500/30 bg-sky-950/30 text-sky-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-sky-400" />
                                                        <span>Main Tender</span>
                                                    </Badge>
                                                ) : viewMode === 'atc' ? (
                                                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-emerald-400" />
                                                        <span>ATC</span>
                                                    </Badge>
                                                ) : f?.source === 'atc' ? (
                                                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-emerald-400" />
                                                        <span>ATC Document</span>
                                                    </Badge>
                                                ) : f?.source === 'regex' ? (
                                                    <Badge variant="outline" className="border-sky-500/30 bg-sky-950/30 text-sky-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-sky-400" />
                                                        <span>Main Tender</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-slate-700 bg-slate-800/40 text-slate-400 text-[10px] py-0.5 px-1.5">
                                                        {f?.source || 'Derived'}
                                                    </Badge>
                                                )}

                                                {f?.confidence && f.confidence !== 'high' && (
                                                    <span className="text-[9px] text-slate-400 uppercase font-mono px-1 py-0.2 rounded bg-slate-800/60 border border-slate-700/60">
                                                        {f.confidence}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Side-by-Side Conflict Comparison */}
                                        {showSideBySide ? (
                                            <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-2.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                                                        Discrepancy:
                                                    </span>
                                                    <span className="text-slate-400">
                                                        Default: <strong className="text-slate-200 font-mono">{formatDisplayValue(f.value)}</strong>
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                    {/* Main Tender side */}
                                                    <div className="rounded-md border border-slate-800 bg-slate-900/80 p-2.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-sky-300 flex items-center gap-1 text-[11px]">
                                                                <FileText className="h-3 w-3" /> Main Tender
                                                            </span>
                                                            {mainSource?.page && (
                                                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">
                                                                    Page {mainSource.page}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-slate-100 font-mono text-xs">
                                                            {formatDisplayValue(mainSource?.value)}
                                                        </div>
                                                        {mainSource?.snippet && (
                                                            <p className="text-[10px] text-slate-400 italic bg-slate-950/50 p-1.5 rounded border border-slate-800/60 font-mono leading-relaxed">
                                                                "{mainSource.snippet}"
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* ATC side */}
                                                    <div className="rounded-md border border-slate-800 bg-slate-900/80 p-2.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-emerald-300 flex items-center gap-1 text-[11px]">
                                                                <FileText className="h-3 w-3" /> ATC Document
                                                            </span>
                                                            {atcSource?.page && (
                                                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                                                    Page {atcSource.page}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-slate-100 font-mono text-xs">
                                                            {formatDisplayValue(atcSource?.value)}
                                                        </div>
                                                        {atcSource?.snippet && (
                                                            <p className="text-[10px] text-slate-400 italic bg-slate-950/50 p-1.5 rounded border border-slate-800/60 font-mono leading-relaxed">
                                                                "{atcSource.snippet}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard value & citation view */
                                            <div className="mt-1.5 text-xs flex flex-col gap-1">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <div className="font-medium text-slate-100 font-mono break-all text-xs sm:text-sm">
                                                        {formatDisplayValue(displayedValue)}
                                                    </div>

                                                    {displayedSource?.page && (
                                                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-800/70 border border-slate-700/50 flex-shrink-0">
                                                            Page {displayedSource.page}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Citation details */}
                                                {isLlmWithoutCitation ? (
                                                    <div className="mt-0.5">
                                                        <span className="text-[10px] text-purple-300/90 italic font-mono bg-purple-950/30 border border-purple-900/40 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                                            <Sparkles className="h-3 w-3 text-purple-400 flex-shrink-0" />
                                                            AI-resolved, no page citation available
                                                        </span>
                                                    </div>
                                                ) : displayedSource?.snippet ? (
                                                    <div className="mt-0.5">
                                                        <div className="text-[10px] text-slate-400 italic bg-slate-950/40 p-1.5 rounded border border-slate-800/60 font-mono leading-relaxed">
                                                            "{isExpanded || displayedSource.snippet.length <= 110
                                                                ? displayedSource.snippet
                                                                : `${displayedSource.snippet.slice(0, 110)}...`}"
                                                            {displayedSource.snippet.length > 110 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSnippet(key)}
                                                                    className="ml-1.5 text-indigo-400 hover:text-indigo-300 not-italic font-sans underline cursor-pointer"
                                                                >
                                                                    {isExpanded ? 'Less' : 'More'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Left Pane Footer Summary */}
                    <div className="border-t border-slate-800 bg-slate-950/60 px-3.5 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <div>
                            Showing {filteredEntries.length} of {fieldEntries.length} fields
                            {missingFields.length > 0 && ` (${missingFields.length} missing)`}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" /> Main
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> ATC
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" /> AI
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Native <iframe> PDF Viewer */}
                <div className="lg:col-span-6 flex flex-col h-[750px] bg-slate-950/60">
                    {/* Viewer Top Bar with Document Switcher */}
                    <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                            {!selfClassifiedAtc && mainTenderUrl && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedViewerDoc('main_tender')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                        selectedViewerDoc === 'main_tender'
                                            ? 'bg-sky-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    Main Tender (NIT)
                                </button>
                            )}

                            {atcUrl && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedViewerDoc('atc')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                        selectedViewerDoc === 'atc'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    {selfClassifiedAtc ? 'ATC Document' : 'ATC Document'}
                                </button>
                            )}

                            {selfClassifiedAtc && !atcUrl && mainTenderUrl && (
                                <span className="text-xs font-medium text-purple-300 px-2.5 py-1 rounded bg-purple-950/40 border border-purple-800/40">
                                    Uploaded Document
                                </span>
                            )}
                        </div>

                        {/* Open in New Window & Download */}
                        {activeViewerPdfUrl && (
                            <div className="flex items-center gap-1">
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 gap-1"
                                >
                                    <a href={activeViewerPdfUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                        <span className="hidden sm:inline">Open</span>
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 gap-1"
                                >
                                    <a href={activeViewerPdfUrl} download>
                                        <Download className="h-3 w-3" />
                                        <span className="hidden sm:inline">Download</span>
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* PDF iframe container */}
                    <div className="flex-1 p-2 relative bg-slate-950/80 overflow-hidden">
                        {activeViewerPdfUrl ? (
                            <iframe
                                key={activeViewerPdfUrl}
                                src={`${activeViewerPdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                title="Tender Document PDF Viewer"
                                className="w-full h-full rounded-lg border border-slate-800 bg-white"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-16">
                                <FileText className="h-10 w-10 mb-2 text-slate-600" />
                                <p className="font-medium text-slate-400">No Document File Available</p>
                                <p className="text-[11px] text-slate-600 mt-1">Ensure a valid PDF was uploaded to the tender record.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExtractionPreviewPanel;
