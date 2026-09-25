import * as React from 'react';
import { Sparkles, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface FieldSourceCitation {
    value: unknown;
    raw_value: string;
    page: number;
    snippet: string;
    confidence?: number;
    status?: string;
}

export interface FieldSources {
    self_classified_atc: boolean;
    has_conflict: boolean;
    main_tender: FieldSourceCitation | null;
    atc: FieldSourceCitation | null;
}

export interface FieldIndicator {
    type: 'high' | 'fallback' | 'low' | 'missing';
    label: string;
    message: string;
    confidenceValue?: number | string;
    suggestedValue?: any;
    source?: string | null;
    sources?: FieldSources;
    rawKey?: string;
}

export const AiIndicatorsContext = React.createContext<Record<string, FieldIndicator>>({});

const LLM_FALLBACK_FIELDS = new Set([
    'orderValue1',
    'orderValue2',
    'orderValue3',
    'techEligibilityAge',
    'avgAnnualTurnoverType',
    'workingCapitalType',
    'netWorthType',
    'netWorthValue',
    'solvencyCertificateType',
    'customEligibilityCriteria',
]);

export const OPTION_CODE_TO_LABEL: Record<string, string> = {
    // PBG / SD
    PBG: 'Performance Bank Guarantee',
    // EMD / Modes
    BG: 'Bank Guarantee',
    DD: 'Demand Draft',
    FDR: 'Fixed Deposit Receipt',
    SB: 'Surety Bond',
    BANK_TRANSFER: 'Bank Transfer',
    PORTAL: 'Pay on Portal',
    // MAF
    YES_GENERAL: 'Yes - General',
    YES_PROJECT_SPECIFIC: 'Yes - Project Specific',
    NO: 'No',
    // Criteria & Physical Docs
    NOT_APPLICABLE: 'Not Applicable',
    AMOUNT: 'Amount',
    ONLY_EMD: 'Only EMD',
    ONLY_OTHER_DOCUMENT: 'Only Other Document',
    EMD_AND_OTHER_DOCUMENTS: 'EMD + Other Documents',
};

function formatDisplayValue(val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) {
        if (val.length === 0) return 'None';
        if (typeof val[0] === 'object') {
            return val.map((item) => JSON.stringify(item)).join('; ');
        }
        return val.map((item) => OPTION_CODE_TO_LABEL[String(item)] || String(item)).join(', ');
    }
    if (typeof val === 'string' && OPTION_CODE_TO_LABEL[val]) {
        return OPTION_CODE_TO_LABEL[val];
    }
    if (typeof val === 'number') {
        return Number.isInteger(val) ? val.toLocaleString('en-IN') : val.toString();
    }
    return String(val);
}

export function AiFieldIndicator({ indicator }: { indicator?: FieldIndicator | null }) {
    if (!indicator) return null;

    const sources = indicator.sources;
    const hasConflict = Boolean(sources?.has_conflict);
    const mainSource = sources?.main_tender;
    const atcSource = sources?.atc;

    const isLlmField = indicator.rawKey ? LLM_FALLBACK_FIELDS.has(indicator.rawKey) : false;
    const isLlmWithoutCitation =
        (indicator.source === 'llm' || isLlmField || indicator.type === 'fallback') &&
        !mainSource?.snippet &&
        !atcSource?.snippet;

    // Determine primary citation if not in conflict
    const primaryCitation = atcSource?.snippet ? atcSource : (mainSource?.snippet ? mainSource : (atcSource || mainSource));
    const isAtcDocument = indicator.source === 'atc' || (Boolean(atcSource) && !mainSource);

    // Badge styling & icon
    let badgeText = indicator.label;
    let badgeColorClass = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
    let badgeIcon = <Sparkles className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />;

    if (hasConflict) {
        badgeText = 'Discrepancy';
        badgeColorClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-400 dark:border-amber-600';
        badgeIcon = <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />;
    } else if (indicator.type === 'fallback') {
        badgeColorClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
        badgeIcon = <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />;
    } else if (indicator.type === 'low') {
        badgeColorClass = 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
        badgeIcon = <AlertTriangle className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />;
    } else if (indicator.type === 'missing') {
        badgeColorClass = 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700';
        badgeIcon = <AlertCircle className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                    }}
                    className={`inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-xs select-none ${badgeColorClass}`}
                    title={`${indicator.message} (Click to view source citation)`}
                >
                    {badgeIcon}
                    <span>{badgeText}</span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={6}
                className={`p-3.5 bg-slate-950 border border-slate-800 text-slate-200 shadow-2xl rounded-xl z-50 text-xs ${
                    hasConflict ? 'w-[380px] sm:w-[440px] max-w-[95vw]' : 'w-[320px] sm:w-[350px] max-w-[95vw]'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-100 text-xs">
                            {indicator.label}
                        </span>
                        {indicator.rawKey && (
                            <span className="text-[10px] text-slate-500 font-mono">
                                ({indicator.rawKey})
                            </span>
                        )}
                    </div>
                    {hasConflict ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                            <span>Conflict</span>
                        </Badge>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {indicator.confidenceValue || indicator.type}
                        </span>
                    )}
                </div>

                {/* 2. Body based on Citation Case */}
                {/* CASE 1: Discrepancy with Side-by-Side Main Tender vs ATC citations */}
                {hasConflict ? (
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-amber-300 font-medium">
                            <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                Conflict between Main Tender & ATC
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Main Tender side */}
                            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sky-300 flex items-center gap-1 text-[11px]">
                                        <FileText className="h-3 w-3 text-sky-400" /> Main Tender
                                    </span>
                                    {mainSource?.page && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-950/70 text-sky-300 border border-sky-800/40">
                                            Page {mainSource.page}
                                        </span>
                                    )}
                                </div>
                                <div className="font-medium text-slate-100 font-mono text-xs">
                                    {formatDisplayValue(mainSource?.value)}
                                </div>
                                {mainSource?.snippet ? (
                                    <p className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded border border-slate-800/70 font-mono leading-relaxed max-h-24 overflow-y-auto">
                                        "{mainSource.snippet}"
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-slate-500 italic">No snippet citation</p>
                                )}
                            </div>

                            {/* ATC side */}
                            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-emerald-300 flex items-center gap-1 text-[11px]">
                                        <FileText className="h-3 w-3 text-emerald-400" /> ATC Document
                                    </span>
                                    {atcSource?.page && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
                                            Page {atcSource.page}
                                        </span>
                                    )}
                                </div>
                                <div className="font-medium text-slate-100 font-mono text-xs">
                                    {formatDisplayValue(atcSource?.value)}
                                </div>
                                {atcSource?.snippet ? (
                                    <p className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded border border-slate-800/70 font-mono leading-relaxed max-h-24 overflow-y-auto">
                                        "{atcSource.snippet}"
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-slate-500 italic">No snippet citation</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : isLlmWithoutCitation ? (
                    /* CASE 2: AI-resolved field with no direct page citation */
                    <div className="rounded-lg bg-purple-950/30 border border-purple-800/40 p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-xs">
                            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                            <span>AI-resolved, no page citation available</span>
                        </div>
                        <p className="text-[11px] text-purple-300/80 leading-relaxed font-mono">
                            This parameter was synthesized by AI model reasoning across tender requirements without a direct verbatim page snippet.
                        </p>
                        {indicator.suggestedValue !== undefined && (
                            <div className="pt-1.5 text-[11px] text-slate-300 border-t border-purple-900/30">
                                Resolved Value: <strong className="font-mono text-white">{formatDisplayValue(indicator.suggestedValue)}</strong>
                            </div>
                        )}
                    </div>
                ) : primaryCitation ? (
                    /* CASE 3: Standard single document citation */
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {isAtcDocument ? (
                                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-emerald-400" />
                                        <span>ATC Document</span>
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-sky-500/30 bg-sky-950/40 text-sky-300 text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-sky-400" />
                                        <span>Main Tender</span>
                                    </Badge>
                                )}
                            </div>

                            {primaryCitation.page && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                    Page {primaryCitation.page}
                                </span>
                            )}
                        </div>

                        {primaryCitation.snippet ? (
                            <div className="text-[10px] text-slate-400 italic bg-slate-900/80 p-2 rounded-md border border-slate-800/80 font-mono leading-relaxed max-h-28 overflow-y-auto">
                                "{primaryCitation.snippet}"
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-500 italic">No page snippet captured</p>
                        )}
                    </div>
                ) : indicator.type === 'missing' ? (
                    /* CASE 4: Missing in PDF */
                    <div className="rounded-lg bg-red-950/30 border border-red-800/40 p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-red-300 font-semibold text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                            <span>Clause Missing in Document</span>
                        </div>
                        <p className="text-[11px] text-red-300/80 leading-relaxed">
                            Clause was not found in the uploaded tender PDF. Please review and enter manually.
                        </p>
                    </div>
                ) : (
                    /* Fallback standard indicator message */
                    <p className="text-xs text-slate-300 leading-relaxed">
                        {indicator.message}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}
