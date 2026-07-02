import { useState, useRef, useEffect } from 'react';
import { Wallet, Landmark, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BankGuaranteeCardStats } from '../helpers/bankGuarantee.types';
import { formatINR } from '@/hooks/useINRFormatter';

// Helper hook for clicking outside
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: Event) => void) {
    useEffect(() => {
        const listener = (event: Event) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}

const bankNameMap: Record<string, string> = {
    'YESBANK_2011': 'Yes Bank 2011',
    'YESBANK_0771': 'Yes Bank 0771',
    'PNB_6011': 'Punjab National Bank',
    'BGLIMIT_0771': 'BG Limit',
};

const BankStatsCards = ({ cardStats }: { cardStats: BankGuaranteeCardStats }) => {
    const [expandedBanks, setExpandedBanks] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef as React.RefObject<HTMLElement>, () => setExpandedBanks([]));

    const handleCardClick = (bankName: string) => {
        setExpandedBanks((prev) => {
            if (prev.includes(bankName)) {
                // If exists, remove it (close)
                return prev.filter((id) => id !== bankName);
            } else {
                // If not exists, add it (open)
                return [...prev, bankName];
            }
        });
    };

    if (!cardStats?.bankStats || Object.keys(cardStats.bankStats).length === 0) return null;

    return (
        <div ref={containerRef} className="grid justify-center grid-flow-col auto-cols-[250px] md:auto-cols-[300px] gap-3 mb-6">
            {Object.entries(cardStats.bankStats).map(([bankName, stats]) => {
                const isExpanded = expandedBanks.includes(bankName);

                return (
                    <Card
                        key={bankName}
                        onClick={() => handleCardClick(bankName)}
                        className={`
                            group relative overflow-hidden cursor-pointer transition-all duration-300
                            border
                            ${isExpanded
                                ? 'bg-card border-emerald-500/50 shadow-lg scale-[1.02] z-10 ring-1 ring-emerald-500/20'
                                : 'bg-card/40 border-border/60 hover:bg-card hover:border-border hover:shadow-md'}
                        `}
                    >
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-600 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />

                        <CardHeader className="px-3 pb-0 flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-0.5">
                                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                                    {bankNameMap[bankName] || bankName}
                                </CardTitle>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                    {stats.percentage.toFixed(2)}% of BGs
                                </p>
                            </div>
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors duration-300 ${isExpanded ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                                <Landmark size={14} />
                            </div>
                        </CardHeader>

                        <CardContent className="px-3 pt-0">
                            <div>
                                <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Total BG Amount</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-foreground tracking-tight">
                                        {formatINR(stats.amount)}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                                    />
                                </div>
                            </div>

                            <div
                                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                            >
                                <div className="overflow-hidden">
                                    <div className="h-px w-full bg-border/50 mb-3" />

                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase text-muted-foreground">FDR 10%</p>
                                            <p className="text-[11px] font-medium text-emerald-600">{formatINR(stats.fdrAmount10)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase text-muted-foreground">FDR 15%</p>
                                            <p className="text-[11px] font-medium text-emerald-600">{formatINR(stats.fdrAmount15)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase text-muted-foreground">FDR 100%</p>
                                            <p className="text-[11px] font-medium text-emerald-600">{formatINR(stats.fdrAmount100)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <Badge variant="outline" className="h-5 px-2 text-[10px] font-normal text-muted-foreground bg-secondary/30 border-border/50">
                                            <Wallet className="w-2.5 h-2.5 mr-1" />
                                            {stats.count} BGs Created
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

export default BankStatsCards;
