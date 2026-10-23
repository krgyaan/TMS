import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import type { OemPerformanceParams } from "./helpers/oem-performance.types";
import { OEM_TABS, DEFAULT_OEM_TAB } from "./helpers/oem-performance.types";

import OemFilterCard from "./components/OemFilterCard";
import OemTenderTable from "./components/OemTenderTable";
import TenderCountBarChart from "./components/TenderCountBarChart";
import DonutChartPerformance from "./components/DonutChartPerformance";

const storageKey = "oem-performance-filters";

const VALID_TAB_KEYS: ReadonlySet<string> = new Set<string>(OEM_TABS.map(t => t.key));

function readSubmittedParams(search: string): OemPerformanceParams | null {
    const searchParams = new URLSearchParams(search);
    const rawOemId = searchParams.get("oemId");
    const from = searchParams.get("fromDate");
    const to = searchParams.get("toDate");
    const tab = searchParams.get("tab");
    const oemId = rawOemId !== null ? Number(rawOemId) : NaN;

    if (Number.isFinite(oemId) && from && to) {
        const resolvedTab = tab && VALID_TAB_KEYS.has(tab) ? tab : DEFAULT_OEM_TAB;
        return { oemId, fromDate: from, toDate: to, tab: resolvedTab };
    }

    try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return null;

        const storedParams = new URLSearchParams(stored);
        const storedOemId = Number(storedParams.get("oemId"));
        const storedFromDate = storedParams.get("fromDate");
        const storedToDate = storedParams.get("toDate");
        const storedTab = storedParams.get("tab");
        if (Number.isFinite(storedOemId) && storedFromDate && storedToDate) {
            const resolvedTab = storedTab && VALID_TAB_KEYS.has(storedTab) ? storedTab : DEFAULT_OEM_TAB;
            return { oemId: storedOemId, fromDate: storedFromDate, toDate: storedToDate, tab: resolvedTab };
        }

        try {
            const legacy = JSON.parse(stored) as Partial<OemPerformanceParams>;
            if (Number.isFinite(Number(legacy.oemId)) && legacy.fromDate && legacy.toDate) {
                const resolvedTab = legacy.tab && VALID_TAB_KEYS.has(legacy.tab) ? legacy.tab : DEFAULT_OEM_TAB;
                return { oemId: Number(legacy.oemId), fromDate: legacy.fromDate, toDate: legacy.toDate, tab: resolvedTab };
            }
        } catch {
            return null;
        }
        return null;
    } catch {
        return null;
    }
}

function buildSearch(params: OemPerformanceParams, tab: string): URLSearchParams {
    return new URLSearchParams({
        oemId: String(params.oemId),
        fromDate: params.fromDate,
        toDate: params.toDate,
        tab,
    });
}

export default function OemPerformancePage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [appliedParams, setAppliedParams] = useState<OemPerformanceParams | null>(() => readSubmittedParams(location.search));
    const [selectedOemId, setSelectedOemId] = useState<number | null>(() => appliedParams?.oemId ?? null);
    const [fromDate, setFromDate] = useState<string | null>(() => appliedParams?.fromDate ?? null);
    const [toDate, setToDate] = useState<string | null>(() => appliedParams?.toDate ?? null);
    const [activeTab, setActiveTab] = useState<string>(() => appliedParams?.tab ?? DEFAULT_OEM_TAB);

    useEffect(() => {
        if (location.search || !appliedParams) return;
        navigate({ search: `?${buildSearch(appliedParams, appliedParams.tab ?? DEFAULT_OEM_TAB).toString()}` }, { replace: true });
    }, [appliedParams, location.search, navigate]);

    const params = useMemo(() => {
        if (!selectedOemId || !fromDate || !toDate) return null;

        return {
            oemId: selectedOemId,
            fromDate,
            toDate,
        };
    }, [selectedOemId, fromDate, toDate]);

    const { data: oems = [] } = useVendorOrganizations();

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (!appliedParams) return;
        const search = buildSearch(appliedParams, value);
        localStorage.setItem(storageKey, search.toString());
        navigate({ search: `?${search.toString()}` }, { replace: true });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>OEM Performance Report</CardTitle>
                            <CardDescription>Analyze performance metrics and interactions with selected Original Equipment Manufacturers.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent />
            </Card>

            <OemFilterCard
                oemOptions={oems.map(oem => ({ id: oem.id.toString(), name: oem.name }))}
                selectedOemId={selectedOemId}
                onSelectOem={setSelectedOemId}
                fromDate={fromDate}
                toDate={toDate}
                onFromDate={setFromDate}
                onToDate={setToDate}
                onSubmit={() => {
                    if (!params) return;
                    const next = { ...params, tab: activeTab };
                    setAppliedParams(next);
                    const search = buildSearch(params, activeTab);
                    localStorage.setItem(storageKey, search.toString());
                    navigate({ search: `?${search.toString()}` }, { replace: true });
                }}
            />

            {appliedParams && (
                <>
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className="h-auto flex-wrap justify-start">
                            {OEM_TABS.map(tab => (
                                <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <OemTenderTable params={appliedParams} tab={activeTab} />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TenderCountBarChart params={appliedParams} />
                        <DonutChartPerformance params={appliedParams} />
                    </div>
                </>
            )}
        </div>
    );
}
