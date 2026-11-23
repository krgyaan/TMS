import { TallyValidationError } from "../errors/tally.errors";

const AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
const MAX_SAFE_PAISE = 9_007_199_254_740_991;

function toAmountText(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "bigint") {
        return value.toString();
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new TallyValidationError("Amount must be a finite number");
        }

        return String(value);
    }

    throw new TallyValidationError("Amount must be a string, number or bigint");
}

function assertSafePaise(paise: bigint): number {
    const asNumber = Number(paise);

    if (!Number.isSafeInteger(asNumber) || Math.abs(asNumber) > MAX_SAFE_PAISE) {
        throw new TallyValidationError("Amount is too large to handle safely");
    }

    return asNumber;
}

export function toPaise(value: unknown): number {
    const text = toAmountText(value);

    if (text === "") {
        throw new TallyValidationError("Amount must not be empty");
    }

    const match = AMOUNT_PATTERN.exec(text);

    if (!match) {
        throw new TallyValidationError(`Amount "${text}" is not a plain decimal with at most two fractional digits`);
    }

    const [, sign, whole, fraction = ""] = match;
    const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

    return assertSafePaise(sign === "-" ? -paise : paise);
}

export function sumPaise(values: readonly number[]): number {
    return values.reduce((total, value) => assertSafePaise(BigInt(total) + BigInt(value)), 0);
}

export function formatTallyAmount(paise: number): string {
    if (!Number.isSafeInteger(paise)) {
        throw new TallyValidationError("Paise amount must be a safe integer");
    }

    const negative = paise < 0;
    const absolute = Math.abs(paise);
    const whole = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, "0");

    return `${negative ? "-" : ""}${whole}.${fraction}`;
}
