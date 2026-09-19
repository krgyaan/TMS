import React, { useState } from 'react';
import { ExtractionPreviewPanel } from './ExtractionPreviewPanel';
import { realDualDocData } from './realExtractionData';
import { extractFieldIndicators } from '../helpers/tenderInfoSheet.autoExtract';
import { AiIndicatorsContext, AiFieldIndicator } from '@/components/form/AiIndicatorsContext';
import { Sparkles, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ExtractionPreviewDemoPage() {
    const [activeTab, setActiveTab] = useState<'badges' | 'split'>('badges');

    // Build real indicators using extractFieldIndicators
    const indicators = extractFieldIndicators(
        realDualDocData.fields as any,
        realDualDocData.missing_fields
    );

    const gailNoidaDocs = JSON.stringify({
        schemaVersion: 1,
        mainTender: 'tender-documents/1789208787800_GAIL_Split_Noida.pdf',
        atc: ['tender-documents/1789208858034_ATcSPlit.pdf'],
        boq: null,
        otherDocuments: [],
    });

    return (
        <AiIndicatorsContext.Provider value={indicators}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
                                <Sparkles className="h-4 w-4" />
                                Interactive Citation Badges Environment
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-100 mt-1">
                                Form Field Confidence & Citation Badges
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">
                                Real unmocked extraction from GAIL Noida NIT + ATC. Click any badge to open its source citation popover.
                            </p>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                            <button
                                type="button"
                                id="tab-badges"
                                onClick={() => setActiveTab('badges')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === 'badges'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Form Field Badges
                            </button>

                            <button
                                type="button"
                                id="tab-split"
                                onClick={() => setActiveTab('split')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === 'split'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                Split-Screen Panel
                            </button>
                        </div>
                    </div>

                    {/* Tab 1: Form Field Badges */}
                    {activeTab === 'badges' && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                                <h3 className="font-semibold text-slate-200 text-sm mb-1 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    Real InfoSheet Form Fields with Clickable Citation Popovers
                                </h3>
                                <p className="text-xs text-slate-400 mb-5">
                                    Clicking any badge reveals document origin (Main Tender vs ATC), page citations, quoted verbatim snippets, or side-by-side discrepancy cards.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* 1. Discrepancy Field (PBG Percentage) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/10">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                PBG Percentage (%)
                                                <AiFieldIndicator indicator={indicators['pbgPercentage']} />
                                            </label>
                                            <span className="text-[10px] text-amber-400 font-mono">has_conflict: true</span>
                                        </div>
                                        <Input
                                            readOnly
                                            value="5"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Conflict between Main Tender (5%) and ATC (3%). Click badge to view comparison.
                                        </p>
                                    </div>

                                    {/* 2. High Confidence Field with Citation (EMD Amount) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-800 bg-slate-950/40">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                EMD Amount (₹)
                                                <AiFieldIndicator indicator={indicators['emdAmount']} />
                                            </label>
                                            <span className="text-[10px] text-emerald-400 font-mono">Page 5</span>
                                        </div>
                                        <Input
                                            readOnly
                                            value="2,00,000"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            High confidence citation from Page 5 with multi-schedule summation.
                                        </p>
                                    </div>

                                    {/* 3. AI Fallback Field without Page Citation (orderValue1) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-purple-500/30 bg-purple-950/10">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                Past Order Value 1 (Single Order)
                                                <AiFieldIndicator indicator={indicators['orderValue1']} />
                                            </label>
                                            <span className="text-[10px] text-purple-400 font-mono">No direct citation</span>
                                        </div>
                                        <Input
                                            readOnly
                                            value="80% of Estimated Tender Value"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            AI-resolved reasoning across tender clauses without a single direct page quote.
                                        </p>
                                    </div>

                                    {/* 4. Missing in PDF Field (tenderFeeAmount) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-red-500/30 bg-red-950/10">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                Tender Fee Amount (₹)
                                                <AiFieldIndicator indicator={indicators['tenderFeeAmount']} />
                                            </label>
                                            <span className="text-[10px] text-red-400 font-mono">Not found</span>
                                        </div>
                                        <Input
                                            readOnly
                                            placeholder="—"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-400 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Missing in uploaded document; requires manual entry.
                                        </p>
                                    </div>

                                    {/* 5. ATC Overridden Field (deliveryTimeSupply) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-slate-800 bg-slate-950/40">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                Delivery Time (Supply)
                                                <AiFieldIndicator indicator={indicators['deliveryTimeSupply']} />
                                            </label>
                                            <span className="text-[10px] text-emerald-400 font-mono">ATC Sourced</span>
                                        </div>
                                        <Input
                                            readOnly
                                            value="15 Days"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Overridden by buyer ATC document clause with citation.
                                        </p>
                                    </div>

                                    {/* 6. Net Worth Value (AI Fallback) */}
                                    <div className="space-y-1.5 p-3.5 rounded-lg border border-purple-500/30 bg-purple-950/10">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-200 flex items-center">
                                                Net Worth Criteria
                                                <AiFieldIndicator indicator={indicators['netWorthCriteria']} />
                                            </label>
                                            <span className="text-[10px] text-purple-400 font-mono">AI Fallback</span>
                                        </div>
                                        <Input
                                            readOnly
                                            value="Positive Net Worth required"
                                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            AI-resolved BEC requirement without direct quote.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Split-Screen Panel */}
                    {activeTab === 'split' && (
                        <ExtractionPreviewPanel
                            fields={realDualDocData.fields as any}
                            selfClassifiedAtc={false}
                            hasAtc={true}
                            missingFields={realDualDocData.missing_fields}
                            processingTimeMs={26300}
                            tenderDocuments={gailNoidaDocs}
                        />
                    )}
                </div>
            </div>
        </AiIndicatorsContext.Provider>
    );
}
