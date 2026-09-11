import { and, eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { warehouses } from "@/db/schemas/operations/warehouses.schema";
import { projects } from "@/db/schemas/master/projects.schema";

export const HO_PROJECT_ID = 151;

export type WarehouseType = "ho_main" | "ho_sub" | "project_location";

export const OWN_ADDRESS_PATTERNS: RegExp[] = [
    /volks\s*energi/i,
    /\bvepl\b/i,
    /mohan\s*co-?op(?:erative)?/i,
    /\bb1\/d8\b/i,
    /mohan\s*estate/i,
];

export function isOwnAddress(source: { shippingAddress?: string | null; shipToName?: string | null }): boolean {
    const text = `${source.shipToName ?? ""}\n${source.shippingAddress ?? ""}`;
    return OWN_ADDRESS_PATTERNS.some(pattern => pattern.test(text));
}

export async function getProjectCode(tx: DbInstance, projectId: number): Promise<string> {
    const project = await tx
        .select({ projectCode: projects.projectCode })
        .from(projects)
        .where(eq(projects.id, projectId))
        .then(rows => rows[0]);
    return project?.projectCode ?? `PROJECT_${projectId}`;
}

export async function ensureProjectWarehouses(tx: DbInstance, projectId: number, name?: string): Promise<{
    projectLocation: { id: number };
    hoSub: { id: number };
}> {
    const warehouseName = name ?? (await getProjectCode(tx, projectId));

    const existing = await tx
        .select({ id: warehouses.id, type: warehouses.type })
        .from(warehouses)
        .where(and(eq(warehouses.projectId, projectId), eq(warehouses.name, warehouseName)));

    let projectLocation = existing.find(w => w.type === "project_location");
    let hoSub = existing.find(w => w.type === "ho_sub");

    if (!hoSub) {
        const hoMain = await tx
            .select({ id: warehouses.id })
            .from(warehouses)
            .where(eq(warehouses.type, "ho_main"))
            .then(rows => rows[0]);
        if (!hoMain) throw new Error("ho_main warehouse is not seeded — run migrations (0135) first");
        const inserted = await tx
            .insert(warehouses)
            .values({ name: warehouseName, type: "ho_sub", projectId, parentId: hoMain.id })
            .returning({ id: warehouses.id, type: warehouses.type });
        hoSub = inserted[0];
    }
    if (!projectLocation) {
        const inserted = await tx
            .insert(warehouses)
            .values({ name: warehouseName, type: "project_location", projectId })
            .returning({ id: warehouses.id, type: warehouses.type });
        projectLocation = inserted[0];
    }

    return { projectLocation: { id: projectLocation.id }, hoSub: { id: hoSub.id } };
}

export async function resolveEntryWarehouseId(
    tx: DbInstance,
    projectId: number,
    shipping: { shippingAddress?: string | null; shipToName?: string | null }
): Promise<number> {
    if (projectId === HO_PROJECT_ID) {
        const hoMain = await tx
            .select({ id: warehouses.id })
            .from(warehouses)
            .where(eq(warehouses.type, "ho_main"))
            .then(rows => rows[0]);
        if (!hoMain) throw new Error("ho_main warehouse is not seeded — run migrations (0135) first");
        return hoMain.id;
    }

    const { projectLocation, hoSub } = await ensureProjectWarehouses(tx, projectId);
    return isOwnAddress(shipping) ? hoSub.id : projectLocation.id;
}