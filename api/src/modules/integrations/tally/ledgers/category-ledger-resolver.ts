export type CategoryLedgerContext = "default" | "project" | "business_development";

export interface CategoryLedgerLinks {
    defaultLedgerId: number | null;
    projectLedgerId: number | null;
    businessDevelopmentLedgerId: number | null;
    blocked: boolean;
}

export interface EntryLedgerResolution {
    context: CategoryLedgerContext;
    autoLedgerId: number | null;
    finalLedgerId: number | null;
    source: "manual" | "auto";
    blocked: boolean;
}

export function normalizeTeamName(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

export function isBusinessDevelopmentTeam(value: string | null | undefined): boolean {
    const normalized = normalizeTeamName(value);

    return normalized === "business development" || normalized === "bd";
}

export function deriveCategoryContext(params: { projectId: number | null; projectTeamName: string | null; employeeIsBusinessDevelopment: boolean }): CategoryLedgerContext {
    if (params.projectId !== null && params.projectId !== undefined) {
        return isBusinessDevelopmentTeam(params.projectTeamName) ? "business_development" : "project";
    }

    return params.employeeIsBusinessDevelopment ? "business_development" : "default";
}

export function resolveAutoCategoryLedgerId(links: CategoryLedgerLinks, context: CategoryLedgerContext): number | null {
    if (context === "business_development") {
        return links.businessDevelopmentLedgerId ?? links.projectLedgerId ?? links.defaultLedgerId;
    }

    if (context === "project") {
        return links.projectLedgerId ?? links.defaultLedgerId;
    }

    return links.defaultLedgerId;
}

export function resolveEntryLedger(params: { overrideLedgerId: number | null | undefined; category: CategoryLedgerLinks; context: CategoryLedgerContext }): EntryLedgerResolution {
    const autoLedgerId = resolveAutoCategoryLedgerId(params.category, params.context);

    if (params.overrideLedgerId !== null && params.overrideLedgerId !== undefined) {
        return {
            context: params.context,
            autoLedgerId,
            finalLedgerId: params.overrideLedgerId,
            source: "manual",
            blocked: false,
        };
    }

    if (params.category.blocked) {
        return { context: params.context, autoLedgerId, finalLedgerId: null, source: "auto", blocked: true };
    }

    return { context: params.context, autoLedgerId, finalLedgerId: autoLedgerId, source: "auto", blocked: false };
}
