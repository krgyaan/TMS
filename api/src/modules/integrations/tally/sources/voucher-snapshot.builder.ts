import { createHash } from "node:crypto";
import { toIstIsoDate, toTallyDate } from "../dates/ist-date";
import {
    isBlockedCategory,
    resolveCategoryLedger,
    resolveCostCentre,
    resolveEmployeeLedger,
    resolveEmployeePayableGroup,
    type CategoryLedgerMapping,
    type ImprestTallyConfig,
} from "../mappings/imprest-tally.config";
import { normalizeMasterName } from "../masters/name.util";
import { sumPaise, toPaise } from "../money/paise";

export type VoucherProblemCode =
    | "NOT_ACCOUNTS_SIGNED"
    | "MISSING_EMPLOYEE"
    | "MISSING_EMPLOYEE_LEDGER"
    | "INACTIVE_EMPLOYEE_LEDGER"
    | "MISSING_VOUCHER_AMOUNT"
    | "INVALID_VOUCHER_AMOUNT"
    | "INVALID_DATE"
    | "NO_LINES"
    | "MISSING_CATEGORY"
    | "BLOCKED_CATEGORY"
    | "UNMAPPED_CATEGORY"
    | "INACTIVE_CATEGORY_LEDGER"
    | "MISSING_AMOUNT"
    | "INVALID_AMOUNT"
    | "NON_POSITIVE_AMOUNT"
    | "MISSING_COST_CENTRE"
    | "LINE_NOT_APPROVED"
    | "DATE_OUTSIDE_PERIOD"
    | "AMOUNT_DRIFT";

export interface VoucherProblem {
    code: VoucherProblemCode;
    message: string;
    imprestId?: number;
}

export interface LedgerLink {
    ledger: string;
    group: string;
    active: boolean;
}

export type EmployeeLedgerLink = LedgerLink;

export interface VoucherLineInput {
    imprestId: number;
    amount: string | number | null;
    categoryId: number | null;
    categoryName?: string | null;
    categoryBlocked?: boolean;
    categoryOverride?: boolean;
    categoryLedger?: LedgerLink | null;
    projectCode: string | null;
    dateOfExpense: Date | string | null;
    approvalStatus: number;
}

export interface VoucherInput {
    voucherId: number;
    voucherCode: string;
    employeeId: number | null;
    employeeName: string | null;
    employeeLedger?: EmployeeLedgerLink | null;
    amount: string | number | null;
    validFrom: Date;
    validTo: Date;
    accountsSignedAt: Date | null;
    lines: VoucherLineInput[];
}

export interface VoucherPostingLine {
    imprestId: number;
    ledger: string;
    ledgerGroup: string;
    costCentre: string;
    amountPaise: number;
}

export interface VoucherSnapshot {
    voucherId: number;
    voucherCode: string;
    employeeId: number | null;
    employeeName: string | null;
    creditLedger: string | null;
    creditGroup: string;
    voucherDate: string | null;
    validFrom: string | null;
    validTo: string | null;
    lines: VoucherPostingLine[];
    totalPaise: number;
    storedAmountPaise: number | null;
    fingerprint: string;
    postable: boolean;
    problems: VoucherProblem[];
}

function parseDate(value: Date | string | null): Date | null {
    if (value === null) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function rawText(value: string | number | bigint | null | undefined): string {
    return value === null || value === undefined ? "" : String(value).trim();
}

function tryPaise(value: unknown): number | null {
    try {
        return toPaise(value);
    } catch {
        return null;
    }
}

export function buildVoucherSnapshot(config: ImprestTallyConfig, voucher: VoucherInput): VoucherSnapshot {
    const problems: VoucherProblem[] = [];
    const orderedLines = [...voucher.lines].sort((left, right) => left.imprestId - right.imprestId);

    if (voucher.accountsSignedAt === null) {
        problems.push({ code: "NOT_ACCOUNTS_SIGNED", message: `Voucher ${voucher.voucherCode} is not signed by accounts` });
    }

    if (voucher.employeeId === null) {
        problems.push({ code: "MISSING_EMPLOYEE", message: `Voucher ${voucher.voucherCode} has no employee` });
    }

    const linkedLedger = voucher.employeeLedger ? normalizeMasterName(voucher.employeeLedger.ledger) : "";
    const creditLedger = linkedLedger.length > 0 ? linkedLedger : resolveEmployeeLedger(config, voucher.employeeId, voucher.employeeName);
    const creditGroup = (voucher.employeeLedger ? normalizeMasterName(voucher.employeeLedger.group) : "") || resolveEmployeePayableGroup(config);

    if (voucher.employeeLedger && !voucher.employeeLedger.active) {
        problems.push({
            code: "INACTIVE_EMPLOYEE_LEDGER",
            message: `Voucher ${voucher.voucherCode} is linked to an inactive ledger`,
        });
    }

    if (creditLedger === null) {
        problems.push({
            code: "MISSING_EMPLOYEE_LEDGER",
            message: `Voucher ${voucher.voucherCode} has no employee payable ledger name`,
        });
    }

    const storedAmountPaise = voucher.amount === null ? null : tryPaise(voucher.amount);

    if (voucher.amount === null) {
        problems.push({ code: "MISSING_VOUCHER_AMOUNT", message: `Voucher ${voucher.voucherCode} has no amount` });
    } else if (storedAmountPaise === null) {
        problems.push({ code: "INVALID_VOUCHER_AMOUNT", message: `Voucher ${voucher.voucherCode} amount is not a valid amount` });
    }

    const fromDate = parseDate(voucher.validFrom);
    const toDate = parseDate(voucher.validTo);
    const validFrom = fromDate ? toIstIsoDate(fromDate) : null;
    const validTo = toDate ? toIstIsoDate(toDate) : null;

    if (!fromDate || !toDate) {
        problems.push({ code: "INVALID_DATE", message: `Voucher ${voucher.voucherCode} has an invalid period` });
    }

    if (orderedLines.length === 0) {
        problems.push({ code: "NO_LINES", message: `Voucher ${voucher.voucherCode} has no linked imprests` });
    }

    const postingLines: VoucherPostingLine[] = [];
    const lineDates = new Map<number, string | null>();
    let amountsAllValid = true;

    for (const line of orderedLines) {
        const label = `Imprest ${line.imprestId}`;

        const fallbackCategory = resolveCategoryLedger(config, line.categoryId);
        const linkedCategory = line.categoryLedger ?? null;
        const categoryLabel = line.categoryName ? `"${line.categoryName}"` : String(line.categoryId);
        let category: CategoryLedgerMapping | null = null;
        let categoryUsable = true;

        if (line.categoryId === null) {
            categoryUsable = false;
            problems.push({ code: "MISSING_CATEGORY", message: `${label} has no category`, imprestId: line.imprestId });
        } else if (!line.categoryOverride && (line.categoryBlocked === true || isBlockedCategory(config, line.categoryId))) {
            categoryUsable = false;
            problems.push({
                code: "BLOCKED_CATEGORY",
                message: `${label} category ${categoryLabel} is blocked from Tally posting`,
                imprestId: line.imprestId,
            });
        } else if (linkedCategory) {
            const ledgerName = normalizeMasterName(linkedCategory.ledger);

            if (!linkedCategory.active) {
                categoryUsable = false;
                problems.push({
                    code: "INACTIVE_CATEGORY_LEDGER",
                    message: `${label} category ${categoryLabel} is mapped to an inactive ledger`,
                    imprestId: line.imprestId,
                });
            }

            category = ledgerName ? { ledger: ledgerName, group: normalizeMasterName(linkedCategory.group) || (fallbackCategory?.group ?? "") } : fallbackCategory;

            if (!category) {
                categoryUsable = false;
                problems.push({
                    code: "UNMAPPED_CATEGORY",
                    message: `${label} category ${categoryLabel} has no ledger mapping`,
                    imprestId: line.imprestId,
                });
            }
        } else {
            category = fallbackCategory;

            if (!category) {
                categoryUsable = false;
                problems.push({
                    code: "UNMAPPED_CATEGORY",
                    message: `${label} category ${categoryLabel} has no ledger mapping`,
                    imprestId: line.imprestId,
                });
            }
        }

        if (line.approvalStatus !== 1) {
            problems.push({ code: "LINE_NOT_APPROVED", message: `${label} is not approved`, imprestId: line.imprestId });
        }

        const amountPaise = line.amount === null ? null : tryPaise(line.amount);

        if (line.amount === null) {
            amountsAllValid = false;
            problems.push({ code: "MISSING_AMOUNT", message: `${label} has no amount`, imprestId: line.imprestId });
        } else if (amountPaise === null) {
            amountsAllValid = false;
            problems.push({ code: "INVALID_AMOUNT", message: `${label} amount is not a valid amount`, imprestId: line.imprestId });
        } else if (amountPaise <= 0) {
            amountsAllValid = false;
            problems.push({ code: "NON_POSITIVE_AMOUNT", message: `${label} amount must be positive`, imprestId: line.imprestId });
        }

        const costCentre = resolveCostCentre(line.projectCode);

        if (costCentre === null) {
            problems.push({ code: "MISSING_COST_CENTRE", message: `${label} has no project code`, imprestId: line.imprestId });
        }

        const lineDate = parseDate(line.dateOfExpense);
        const lineDateIso = lineDate ? toIstIsoDate(lineDate) : null;
        lineDates.set(line.imprestId, lineDateIso);

        if (!lineDateIso) {
            problems.push({ code: "INVALID_DATE", message: `${label} has an invalid expense date`, imprestId: line.imprestId });
        } else if (validFrom && validTo && (lineDateIso < validFrom || lineDateIso > validTo)) {
            problems.push({
                code: "DATE_OUTSIDE_PERIOD",
                message: `${label} expense date ${lineDateIso} is outside the voucher period`,
                imprestId: line.imprestId,
            });
        }

        if (category && categoryUsable && costCentre && amountPaise !== null && amountPaise > 0) {
            postingLines.push({
                imprestId: line.imprestId,
                ledger: category.ledger,
                ledgerGroup: category.group,
                costCentre,
                amountPaise,
            });
        }
    }

    const totalPaise = sumPaise(postingLines.map(line => line.amountPaise));

    if (storedAmountPaise !== null && amountsAllValid && orderedLines.length > 0 && postingLines.length === orderedLines.length && totalPaise !== storedAmountPaise) {
        problems.push({
            code: "AMOUNT_DRIFT",
            message: `Voucher ${voucher.voucherCode} stores ${storedAmountPaise} paise but its lines total ${totalPaise} paise`,
        });
    }

    const voucherDate = fromDate ? toTallyDate(fromDate) : null;

    const fingerprint = createHash("sha256")
        .update(
            JSON.stringify({
                entityType: "imprest_voucher",
                entityId: String(voucher.voucherId),
                voucherCode: voucher.voucherCode,
                employeeId: voucher.employeeId,
                creditLedger,
                voucherDate,
                storedAmountPaise,
                lines: orderedLines.map(line => ({
                    imprestId: line.imprestId,
                    categoryId: line.categoryId,
                    amount: rawText(line.amount),
                    projectCode: resolveCostCentre(line.projectCode),
                    date: lineDates.get(line.imprestId) ?? null,
                    approvalStatus: line.approvalStatus,
                })),
            })
        )
        .digest("hex");

    return {
        voucherId: voucher.voucherId,
        voucherCode: voucher.voucherCode,
        employeeId: voucher.employeeId,
        employeeName: voucher.employeeName,
        creditLedger,
        creditGroup,
        voucherDate,
        validFrom,
        validTo,
        lines: postingLines,
        totalPaise,
        storedAmountPaise,
        fingerprint,
        postable: problems.length === 0,
        problems,
    };
}
