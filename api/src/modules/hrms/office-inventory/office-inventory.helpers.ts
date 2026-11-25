/**
 * Pure calculation helpers implementing the exact Excel workbook formulas
 * for HRMS Office Inventory Management.
 */

export const ITEM_CATEGORY_PREFIX: Record<string, string> = {
    Housekeeping: "HK",
    Pantry: "PN",
    Stationery: "ST",
};

export const EQUIPMENT_CATEGORY_PREFIX: Record<string, string> = {
    Housekeeping: "EQ-HK",
    Pantry: "EQ-PN",
};

export const CLEANING_FREQUENCY_DAYS: Record<string, number> = {
    Daily: 1,
    Weekly: 7,
    Fortnightly: 14,
    Monthly: 30,
    Quarterly: 90,
};

export function toNum(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Generate the next sequential code like HK-001, PN-001, ST-001, EQ-HK-001, AP-001.
 */
export function generateNextCode(prefix: string, existingCodes: string[]): string {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escaped}-(\\d+)$`, "i");
    let maxNum = 0;
    for (const code of existingCodes) {
        const match = code.trim().match(regex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }
    return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Item Master formula:
 * Current Stock = Opening Stock + Total Purchased - Total Consumed
 * Status = "LOW STOCK" when Current Stock <= Minimum Stock Level, else "OK"
 */
export function computeItemStock(
    openingStock: number,
    totalPurchased: number,
    totalConsumed: number,
    minStockLevel: number
): { currentStock: number; status: "LOW STOCK" | "OK" } {
    const currentStock = round2(openingStock + totalPurchased - totalConsumed);
    const status = currentStock <= minStockLevel ? "LOW STOCK" : "OK";
    return { currentStock, status };
}

/**
 * Equipment Register formula:
 * Current Qty = Opening Qty + Qty Added (New Purchase) - Qty Discarded (End of Life + Damaged/Lost)
 */
export function computeEquipmentQty(
    openingQty: number,
    qtyAdded: number,
    qtyDiscarded: number
): number {
    return round2(openingQty + qtyAdded - qtyDiscarded);
}

/**
 * Format a UTC Date as YYYY-MM-DD.
 */
export function formatIsoDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD date string into a UTC midnight Date.
 */
export function parseIsoDate(dateStr: string): Date {
    const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/**
 * Add `days` to a YYYY-MM-DD date string and return YYYY-MM-DD.
 */
export function addDaysIso(dateStr: string, days: number): string {
    const dt = parseIsoDate(dateStr);
    dt.setUTCDate(dt.getUTCDate() + days);
    return formatIsoDate(dt);
}

/**
 * Month end date (YYYY-MM-DD) for a given YYYY-MM-DD date string.
 */
export function monthEndIso(dateStr: string): string {
    const dt = parseIsoDate(dateStr);
    const end = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0));
    return formatIsoDate(end);
}

/**
 * Current Mon–Sun week boundaries (matching Excel: TODAY() - WEEKDAY(TODAY(), 2) + 1).
 */
export function getCurrentWeekBounds(referenceDate: Date = new Date()): {
    weekStart: string;
    weekEnd: string;
    today: string;
} {
    const utcToday = new Date(
        Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
    );
    const dayOfWeek = utcToday.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(utcToday);
    monday.setUTCDate(utcToday.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
        weekStart: formatIsoDate(monday),
        weekEnd: formatIsoDate(sunday),
        today: formatIsoDate(utcToday),
    };
}

/**
 * Pantry Appliances Next Cleaning Due formula (exact Excel match):
 * - If status === "Discarded" -> null
 * - If !cleaningFrequency || cleaningFrequency === "As Needed" -> null
 * - Base date = lastCleanedDate if cleaningsCount > 0, else purchaseDate
 * - If no base date -> null
 * - Next Cleaning Due = baseDate + intervalDays (Daily=1, Weekly=7, Fortnightly=14, Monthly=30, Quarterly=90, default=30)
 */
export function computeNextCleaningDue(params: {
    status: string;
    cleaningFrequency: string;
    purchaseDate: string | null;
    cleaningsCount: number;
    lastCleanedDate: string | null;
}): string | null {
    if (params.status === "Discarded") return null;
    if (!params.cleaningFrequency || params.cleaningFrequency === "As Needed") return null;
    const baseDate = params.cleaningsCount > 0 ? params.lastCleanedDate : params.purchaseDate;
    if (!baseDate) return null;
    const intervalDays = CLEANING_FREQUENCY_DAYS[params.cleaningFrequency] ?? 30;
    return addDaysIso(baseDate, intervalDays);
}
