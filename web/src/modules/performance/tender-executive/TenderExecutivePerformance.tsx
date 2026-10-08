import { useEffect, useMemo, useRef, useState } from "react";

/* UI Components */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { usePerformanceOutcomes, useStageMatrix } from "@/hooks/api/useTenderExecutivePerformance";
import type { TenderKpiKey } from "./helpers/tender-executive.types";

/* Icons */
import { Combobox } from "@/components/form/SelectField";
import { useUsersByRole } from "@/hooks/api/useUsers";
import {
    AlertTriangle,
    Briefcase,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Filter,
    Info,
    Trophy,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EmdBacklogTable } from "./components/EmdBacklogTable";
import { StageBacklogV4Table } from "./components/StageBacklogV4Table";
import { ScoreDrilldownPopover } from "./components/ScoreDrilldownPopover";


const UNRESTRICTED_ROLES = new Set(["Super User", "Admin", "Coordinator"]);


const STAGE_ROW_TYPE_MAP: Record<string, string> = {
    done: "default",
    onTime: "success",
    late: "warning",
    pending: "info",
    overdue: "destructive",
    notApplicable: "default",
};

const formatLabel = (label: string) => {
    return label
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

export type Scope =
    | { view: "user"; userId: number }
    | { view: "team"; teamId: number }
    | { view: "all" }
    | { view: null };

const SCOPE_STORAGE_KEY = "tms:tender-executive-scope";

function isDateString(value: string | null): value is string {
    return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parsePositiveId(value: string | null) {
    const id = Number(value);
    return value !== null && Number.isInteger(id) && id > 0 ? id : null;
}

type InitialFilters = {
    scope: Scope;
    fromDate: string | null;
    toDate: string | null;
};

const FILTER_KEYS = ["userId", "teamId", "view", "fromDate", "toDate"];

function readFiltersFrom(source: URLSearchParams): InitialFilters {
    const userId = parsePositiveId(source.get("userId"));
    const teamId = parsePositiveId(source.get("teamId"));
    const viewAll = source.get("view") === "all";
    const rawFrom = source.get("fromDate");
    const rawTo = source.get("toDate");

    return {
        scope: viewAll
            ? { view: "all" }
            : userId
              ? { view: "user", userId }
              : teamId
                ? { view: "team", teamId }
                : { view: null },
        fromDate: isDateString(rawFrom) ? rawFrom : null,
        toDate: isDateString(rawTo) ? rawTo : null,
    };
}

function readInitialFilters(search: string): InitialFilters {
    const params = new URLSearchParams(search);
    if (FILTER_KEYS.some(key => params.has(key))) {
        return readFiltersFrom(params);
    }

    try {
        return readFiltersFrom(new URLSearchParams(localStorage.getItem(SCOPE_STORAGE_KEY) ?? ""));
    } catch {
        localStorage.removeItem(SCOPE_STORAGE_KEY);
        return { scope: { view: null }, fromDate: null, toDate: null };
    }
}

function isSameScope(a: Scope, b: Scope) {
    if (a.view !== b.view) return false;
    if (a.view === "user" && b.view === "user") return a.userId === b.userId;
    if (a.view === "team" && b.view === "team") return a.teamId === b.teamId;
    return true;
}

/**
 * Decide the scope a locked role should open with.
 *
 * Unrestricted roles (Super User / Admin / Coordinator) keep whatever the URL or
 * localStorage held, since choosing their own scope is legitimate. Everyone else
 * is pinned on first render so a bookmarked team or member cannot survive a role
 * change: self-scope roles start on their own record, Team Leaders start on their
 * own team. Returns the restored scope unchanged while auth is still loading, so
 * the effect that follows auth arrival can do the pinning instead.
 */
function resolveInitialScope(
    restored: Scope,
    access: { unrestricted: boolean; selfOnly: boolean; teamId: number | null; userId: number | null }
): Scope {
    if (access.unrestricted) return restored;
    if (access.selfOnly) return access.userId ? { view: "user", userId: access.userId } : restored;
    return access.teamId ? { view: "team", teamId: access.teamId } : restored;
}

/* Team labels used by the Team dropdown and the scope note. */
const TEAM_LABELS: Record<number, string> = { 1: "AC Team", 2: "DC Team" };

// const TEAM_OPTIONS = [
//     { label: "All Teams", value: "all" },
//     { label: "AC Team", value: 1 }, // ← actual team ID
//     { label: "DC Team", value: 2 }, // ← actual team ID
// ];

/* ================================
   MAIN PAGE COMPONENT
================================ */

export default function TenderExecutivePerformance() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { role, dataScope, teamId: authTeamId, teamName: authTeamName, user: authUser } = useAuth();

    /* Whether this user may pick any team and any member. */
    const unrestricted = UNRESTRICTED_ROLES.has(role ?? "");
    /* Team Leader and self-scope roles keep the Team dropdown pinned to their own team. */
    const teamLocked = !unrestricted;
    /* Self-scope roles (Executive / Engineer / Field) are pinned to their own record. */
    const selfOnly = dataScope === "self";
    const authUserId = authUser?.id ?? null;

    const [initialFilters] = useState(() => readInitialFilters(searchParams.toString()));

    /* Pin locked roles before the first paint so the tables never issue a request
       for a team or member the user is not allowed to see. */
    const initialScope = useMemo(
        () => resolveInitialScope(initialFilters.scope, { unrestricted, selfOnly, teamId: authTeamId, userId: authUserId }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [draftScope, setDraftScope] = useState<Scope>(initialScope);
    const [draftFromDate, setDraftFromDate] = useState<string | null>(initialFilters.fromDate);
    const [draftToDate, setDraftToDate] = useState<string | null>(initialFilters.toDate);

    const [appliedScope, setAppliedScope] = useState<Scope>(initialScope);
    const [appliedFromDate, setAppliedFromDate] = useState<string | null>(initialFilters.fromDate);
    const [appliedToDate, setAppliedToDate] = useState<string | null>(initialFilters.toDate);

const [selectedMetric, setSelectedMetric] = useState<TenderKpiKey | null>(null);
      const lastWrittenRef = useRef<string>(searchParams.toString());
    const restoredRef = useRef(false);
    const hydratedRef = useRef(false);

    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;

        if (searchParams.toString()) return;
        const cached = localStorage.getItem(SCOPE_STORAGE_KEY) ?? "";
        if (!cached) return;

        lastWrittenRef.current = cached;
        setSearchParams(new URLSearchParams(cached), { replace: true });
    }, [searchParams, setSearchParams]);

    /**
     * Overwrite any scope restored from the URL or localStorage that exceeds
     * what this user may see, so a bookmarked team or member cannot survive a
     * role change. Runs once per identity.
     */
    useEffect(() => {
        /* Unrestricted roles legitimately pick their own scope, so a saved
           preference must survive a reload. */
        if (authUserId == null || authTeamId == null || unrestricted) return;

        const forced: Scope = selfOnly ? { view: "user", userId: authUserId } : { view: "team", teamId: authTeamId };

        setDraftScope(current => (isSameScope(current, forced) ? current : forced));
        setAppliedScope(current => (isSameScope(current, forced) ? current : forced));
    }, [authUserId, authTeamId, selfOnly, teamLocked, unrestricted]);

    useEffect(() => {
        const current = searchParams.toString();

        if (!hydratedRef.current) {
            if (current === lastWrittenRef.current) hydratedRef.current = true;
            return;
        }

        if (current === lastWrittenRef.current) return;

        const userId = parsePositiveId(searchParams.get("userId"));
        const teamId = parsePositiveId(searchParams.get("teamId"));
        const viewAll = searchParams.get("view") === "all";
        const urlScope: Scope = viewAll
            ? { view: "all" }
            : userId
              ? { view: "user", userId }
              : teamId
                ? { view: "team", teamId }
                : { view: null };
        const rawFrom = searchParams.get("fromDate");
        const rawTo = searchParams.get("toDate");
        const urlFrom = isDateString(rawFrom) ? rawFrom : null;
        const urlTo = isDateString(rawTo) ? rawTo : null;

        setDraftScope(current => (isSameScope(current, urlScope) ? current : urlScope));
        setAppliedScope(current => (isSameScope(current, urlScope) ? current : urlScope));
        setDraftFromDate(current => (current === urlFrom ? current : urlFrom));
        setAppliedFromDate(current => (current === urlFrom ? current : urlFrom));
        setDraftToDate(current => (current === urlTo ? current : urlTo));
        setAppliedToDate(current => (current === urlTo ? current : urlTo));
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (appliedScope.view === "user") params.set("userId", String(appliedScope.userId));
        if (appliedScope.view === "team") params.set("teamId", String(appliedScope.teamId));
        if (appliedScope.view === "all") params.set("view", "all");
        if (appliedFromDate) params.set("fromDate", appliedFromDate);
        if (appliedToDate) params.set("toDate", appliedToDate);

        const next = params.toString();
        lastWrittenRef.current = next;
        if (next) localStorage.setItem(SCOPE_STORAGE_KEY, next);
        setSearchParams(prev => (next === prev.toString() ? prev : params), { replace: true });
    }, [appliedFromDate, appliedScope, appliedToDate, setSearchParams]);

    const dateError = draftFromDate && draftToDate && draftFromDate > draftToDate ? "From Date must be on or before To Date" : null;
    /* A locked role is pinned to a valid scope by the effect above, so it must never
       gate Submit on a scope the user cannot change anyway. */
    const scopeSettled = teamLocked || draftScope.view !== null;
    const canSubmit = scopeSettled && !!draftFromDate && !!draftToDate && !dateError;
    const hasAnyFilter =
        draftScope.view !== null || !!draftFromDate || !!draftToDate || appliedScope.view !== null || !!appliedFromDate || !!appliedToDate || selectedMetric !== null;

    const handleSubmit = () => {
        if (!canSubmit) return;
        /* For a locked role the draft can still be empty if auth arrived after the first
           render, so submit the resolved scope rather than an empty one. */
        const effectiveScope = draftScope.view === null && teamLocked && authTeamId != null ? ({ view: "team", teamId: authTeamId } as Scope) : draftScope;

        setAppliedScope(effectiveScope);
        setAppliedFromDate(draftFromDate);
        setAppliedToDate(draftToDate);
    };

    const handleClear = () => {
        setDraftScope({ view: null });
        setDraftFromDate(null);
        setDraftToDate(null);
        setAppliedScope({ view: null });
        setAppliedFromDate(null);
        setAppliedToDate(null);
        setSelectedMetric(null);
        localStorage.removeItem(SCOPE_STORAGE_KEY);
        lastWrittenRef.current = "";
        setSearchParams({}, { replace: true });
    };

    const baseRange = appliedFromDate && appliedToDate ? { fromDate: appliedFromDate, toDate: appliedToDate } : null;

    const userQuery = baseRange && appliedScope.view === "user" ? { ...baseRange, view: "user" as const, userId: (appliedScope as { view: "user"; userId: number }).userId } : null;

    const sharedQuery =
        baseRange && appliedScope.view === "user"
            ? { ...baseRange, view: "user" as const, userId: (appliedScope as { view: "user"; userId: number }).userId }
            : baseRange && appliedScope.view === "team"
              ? { ...baseRange, view: "team" as const, teamId: (appliedScope as { view: "team"; teamId: number }).teamId }
              : baseRange && appliedScope.view === "all"
                ? { ...baseRange, view: "all" as const }
                : null;

    const { data: allUsers } = useUsersByRole(5);

    /* Team Leaders see only their own team's members. A member with no team, or a
       session whose team name is missing, is not filtered out here — the backend
       scope clamp still refuses the data, so hiding them would only mislead. */
    const users = useMemo(() => {
        if (!allUsers) return [];
        if (unrestricted || !teamLocked) return allUsers;
        if (!authTeamName) return allUsers;
        return allUsers.filter(u => {
            const memberTeam = (u.team as unknown as string | null) ?? null;
            return !memberTeam || memberTeam === authTeamName;
        });
    }, [allUsers, unrestricted, teamLocked, authTeamName]);

    /* The team that "All Team Members" resolves to: the selected team, or the locked-in
       team for roles that cannot change it. */
    const memberScopeTeamId = draftScope.view === "team" ? draftScope.teamId : authTeamId;

    /** Describes whose data is on screen, using the applied scope (what actually loaded). */
    const scopeNote = useMemo(() => {
        if (appliedScope.view === "all") return "You are viewing data for all teams (AC and DC).";
        if (appliedScope.view === "team") {
            const team = (appliedScope as { view: "team"; teamId: number }).teamId;
            return `You are viewing data for the ${TEAM_LABELS[team] ?? "selected team"}.`;
        }
        if (appliedScope.view === "user") {
            const id = (appliedScope as { view: "user"; userId: number }).userId;
            const member = users.find(u => u.id === id)?.name;
            return member ? `You are viewing data for ${member}.` : "You are viewing data for the selected team member.";
        }
        return "Select a team or team member to view their data.";
    }, [appliedScope, users]);

    const { data: outcomes } = usePerformanceOutcomes(userQuery);
    const { data: stageMatrix } = useStageMatrix(userQuery);

    const STAGES = stageMatrix?.stages ?? [];
    const STAGE_MATRIX = stageMatrix?.rows ?? [];

    type KpiItem = { key: TenderKpiKey; label: string; count: number; icon: LucideIcon; color: string; bg: string };

    const PRE_BID_KPIS = useMemo<KpiItem[]>(() => {
        if (!outcomes) return [];

        return [
            {
                key: "ALLOCATED",
                label: "Allocated",
                count: outcomes.allocated,
                icon: Briefcase,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
            },
            {
                key: "APPROVED",
                label: "Approved",
                count: outcomes.approved,
                icon: CheckCircle2,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
            {
                key: "REJECTED",
                label: "Rejected",
                count: outcomes.rejected,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "PENDING",
                label: "Pending",
                count: outcomes.pending,
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-50",
            },
        ];
    }, [outcomes]);

    const POST_BID_KPIS = useMemo<KpiItem[]>(() => {
        if (!outcomes) return [];

        return [
            {
                key: "BID",
                label: "Bid",
                count: outcomes.bid,
                icon: FileText,
                color: "text-sky-600",
                bg: "bg-sky-50",
            },
            {
                key: "MISSED",
                label: "Missed",
                count: outcomes.missed,
                icon: AlertTriangle,
                color: "text-rose-600",
                bg: "bg-rose-50",
            },
            {
                key: "DISQUALIFIED",
                label: "Disqualified",
                count: outcomes.disqualified,
                icon: AlertTriangle,
                color: "text-orange-600",
                bg: "bg-orange-50",
            },
            {
                key: "RESULT_AWAITED",
                label: "Result Awaited",
                count: outcomes.resultAwaited,
                icon: FileText,
                color: "text-blue-600",
                bg: "bg-blue-50",
            },
            {
                key: "LOST",
                label: "Lost",
                count: outcomes.lost,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "WON",
                label: "Won",
                count: outcomes.won,
                icon: Trophy,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
        ];
    }, [outcomes]);

    const renderKpiCard = (kpi: KpiItem) => {
        const isSelected = selectedMetric === kpi.key;

        return (
            <button
                key={kpi.key}
                onClick={() => setSelectedMetric(kpi.key)}
                className={`
                group relative overflow-hidden
                flex flex-col
                p-5 rounded-2xl border
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-xl
                ${
                    isSelected
                        ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/40 ring-2 ring-primary/50"
                        : "bg-card/80 backdrop-blur border-border hover:border-primary/30"
                }
            `}
            >
                {/* Glow Accent */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

                {/* KPI Row */}
                <div className="relative flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${kpi.bg} shadow-sm`}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>

                    <span className="text-[11px] tracking-wide font-semibold text-muted-foreground uppercase whitespace-nowrap">{kpi.label}</span>

                    <span className="ml-auto text-2xl font-bold tracking-tight">{kpi.count}</span>
                </div>

                {/* Selection Bar */}
                {isSelected && <div className="absolute bottom-0 left-0 h-1 w-full bg-primary rounded-t-full" />}
            </button>
        );
    };
    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER & FILTERS ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze tender outcomes, stage velocity, and executive scoring.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                {/* ===== SINGLE CONTAINING CARD =====
                    Every section below is a full-width slice of this one box. Boundaries between
                    sections are drawn by divide-y (a thin 1px line), not by gaps, so there is no
                    vertical whitespace between them. */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50 overflow-hidden">
                    <CardContent className="p-0">
                        {/* FILTER BAR */}
                        <div className="p-6 border-b border-border/60">
                        <div className="flex flex-wrap items-end gap-4">
                            {/* TEAM SELECT */}
                            <div className="min-w-[200px] flex-1 space-y-2">
                                <label className="text-sm font-medium">Team</label>
                                <Combobox
                                    disabled={teamLocked}
                                    value={
                                        teamLocked
                                            ? String(draftScope.view === "team" ? draftScope.teamId : authTeamId ?? "")
                                            : draftScope.view === "team"
                                              ? String(draftScope.teamId)
                                              : draftScope.view === "all"
                                                ? "all"
                                                : ""
                                    }
                                    onChange={v => {
                                        if (v === "all") {
                                            setDraftScope({ view: "all" });
                                            return;
                                        }
                                        const teamId = parsePositiveId(v);
                                        setDraftScope(teamId ? { view: "team", teamId } : { view: null });
                                    }}
                                    options={
                                        teamLocked && authTeamId
                                            ? [{ id: String(authTeamId), name: authTeamName ?? "Your Team" }]
                                            : [
                                                  { id: "all", name: "All Teams" },
                                                  { id: "1", name: "AC Team" },
                                                  { id: "2", name: "DC Team" },
                                              ]
                                    }
                                    placeholder="Select Team"
                                />
                            </div>

                            {/* USER SELECT */}
                            <div className="min-w-[200px] flex-1 space-y-2">
                                <label className="text-sm font-medium">Team Member</label>
                                <Combobox
                                    disabled={selfOnly || draftScope.view === "all"}
                                    value={
                                        selfOnly
                                            ? String(authUserId ?? "")
                                            : draftScope.view === "user"
                                              ? String(draftScope.userId)
                                              : draftScope.view === "team"
                                                ? "all"
                                                : ""
                                    }
                                    onChange={v => {
                                        /* "All Team Members" is the team view, not a member. */
                                        if (v === "all") {
                                            if (memberScopeTeamId != null) setDraftScope({ view: "team", teamId: memberScopeTeamId });
                                            return;
                                        }
                                        const userId = parsePositiveId(v);
                                        setDraftScope(userId ? { view: "user", userId } : { view: null });
                                    }}
                                    options={[
                                        /* Omitted when the team view is "All Teams", where it
                                           would just repeat the same selection. */
                                        ...(memberScopeTeamId != null && draftScope.view !== "all" ? [{ id: "all", name: "All Team Members" }] : []),
                                        ...(users?.map(u => ({ id: u.id.toString(), name: u.name })) ?? []),
                                    ]}
                                    placeholder="Select User"
                                />
                            </div>
                            {/* FROM DATE */}
                            <div className="w-[165px] shrink-0 space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={draftFromDate ?? ""} onChange={e => setDraftFromDate(e.target.value || null)} />
                                </div>
                            </div>

                            {/* TO DATE */}
                            <div className="w-[165px] shrink-0 space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={draftToDate ?? ""} onChange={e => setDraftToDate(e.target.value || null)} />
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex shrink-0 gap-2">
                                <Button onClick={handleSubmit} disabled={!canSubmit}>
                                    <Filter className="mr-2 h-4 w-4" /> Submit
                                </Button>
                                <Button variant="outline" onClick={handleClear} disabled={!hasAnyFilter}>
                                    <X className="mr-2 h-4 w-4" /> Clear
                                </Button>
                            </div>
                        </div>
                        {dateError && <p className="mt-2 text-sm text-destructive">{dateError}</p>}

                        {/* SCOPE NOTE - spells out whose data the grid is showing, so the
                            effect of the Team / Team Member dropdowns is never ambiguous. */}
                        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{scopeNote}</span>
                        </p>
                        </div>

                        {/* divide-y draws the thin line above every section except the first,
                            so the final section has no trailing border - the card's own border
                            closes the box. */}
                        <div className="divide-y divide-border/60">
                        {/* ===== STAGE BACKLOG ===== */}
                        {sharedQuery && <StageBacklogV4Table {...sharedQuery} />}

                        {/* ===== EMD BACKLOG ===== */}
                        {sharedQuery && <EmdBacklogTable {...sharedQuery} />}

                        {appliedScope.view === "user" && (
                            <>
                        {/* ===== KPI CARDS ===== */}
                        <div className="space-y-6 hidden">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Pre-Bid</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{PRE_BID_KPIS.map(renderKpiCard)}</div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Post-Bid</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{POST_BID_KPIS.map(renderKpiCard)}</div>
                            </div>
                        </div>

{/* ===== STAGE MATRIX / KANBAN METRICS ===== */}
                        <div>
                            <div className="p-6 pb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                    Stage Efficiency Matrix
                                </h2>
                                <p className="text-sm text-muted-foreground">Detailed breakdown of tender counts per stage and status.</p>
                            </div>

                            <div>
                                <Table className="w-full table-fixed border-collapse">
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-muted/30 border-b border-border/60">
                                            <TableHead className="w-[120px] h-auto px-2 pt-3 pb-2 align-top font-bold text-foreground bg-muted/30 sticky left-0 z-10 border-r">Metric / Stage</TableHead>
                                            {STAGES.map((stage, i) => (
                                                <TableHead key={i} className="h-auto px-1 pt-3 pb-2 text-center text-xs uppercase font-semibold text-muted-foreground whitespace-normal break-words align-top leading-tight">
                                                    <div className="flex flex-wrap items-start justify-center gap-x-1 text-center leading-tight">
                                                        {formatLabel(stage)}
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {STAGE_MATRIX.map((row, i) => {
                                            const rowType = STAGE_ROW_TYPE_MAP[row.key];
                                            return (
                                                <TableRow
                                                    key={i}
                                                    className={`
                                        ${row.label === "Approved" ? "bg-primary/5" : ""} 
                                        hover:bg-muted/20
                                    `}
                                                >
                                                    <TableCell
                                                        className={`
                                            font-semibold sticky left-0 z-10 border-r bg-background whitespace-normal break-words
                                            ${rowType === "info" ? "text-primary" : ""}
                                            ${rowType === "success" ? "text-emerald-600" : ""}
                                            ${rowType === "warning" ? "text-amber-600" : ""}
                                            ${rowType === "destructive" ? "text-destructive" : ""}
                                        `}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-left leading-tight">
                                                            <span>{row.label}</span>
                                                        </div>
                                                    </TableCell>
                                                    {row.data.map((val, j) => (
                                                        <TableCell key={j} className="text-center p-1.5">
                                                            {val !== null ? (
                                                                (() => {
                                                                    const drilldown = row.drilldown[j] ?? [];
                                                                    const tenders = drilldown.map(item => ({
                                                                        tenderId: item.tenderId,
                                                                        tenderNo: item.tenderNo ?? `Tender #${item.tenderId}`,
                                                                        tenderName: item.tenderName ?? "Tender name unavailable",
                                                                        value: item.value ?? 0,
                                                                        date: item.completedAt ?? item.deadline ?? null,
                                                                        status: item.status ?? null,
                                                                    }));

                                                                    return (
                                                                        <ScoreDrilldownPopover
                                                                            title={`${row.label} · ${formatLabel(STAGES[j])}`}
                                                                            tenders={tenders}
                                                                            trigger={
                                                                                <div
                                                                                    className={`
                                                                                    mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm font-bold
                                                                                    ${rowType === "success" ? "bg-emerald-100/70 text-emerald-700" : ""}
                                                                                    ${rowType === "completed" ? "bg-green-100/70 text-green-700" : ""}
                                                                                    ${rowType === "warning" ? "bg-amber-100/70 text-amber-700" : ""}
                                                                                    ${rowType === "info" ? "bg-sky-100/70 text-sky-700" : ""}
                                                                                    ${rowType === "destructive" ? "bg-destructive/10 text-destructive" : ""}
                                                                                    ${rowType === "default" ? "bg-muted text-muted-foreground" : ""}
                                                                                `}
                                                                                >
                                                                                    {val}
                                                                                </div>
                                                                            }
                                                                        />
                                                                    );
                                                                })()
                                                            ) : (
                                                                <span className="text-muted-foreground/20 text-xl">·</span>
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        })}

                                    </TableBody>
                                    </Table>
                            </div>
                        </div>
                            </>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
