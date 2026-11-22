import { TallyValidationError } from "../errors/tally.errors";

export const TALLY_TIME_ZONE = "Asia/Kolkata";

const istDateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TALLY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export interface IstDateParts {
    year: number;
    month: number;
    day: number;
}

function assertValidDate(date: Date): void {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new TallyValidationError("Invalid date");
    }
}

export function toIstDateParts(date: Date): IstDateParts {
    assertValidDate(date);

    const parts = istDateFormatter.formatToParts(date);
    const read = (type: "year" | "month" | "day"): number => {
        const part = parts.find(entry => entry.type === type);

        if (!part) {
            throw new TallyValidationError(`Could not derive the ${type} in ${TALLY_TIME_ZONE}`);
        }

        return Number(part.value);
    };

    return { year: read("year"), month: read("month"), day: read("day") };
}

export function toIstIsoDate(date: Date): string {
    const { year, month, day } = toIstDateParts(date);

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toTallyDate(date: Date): string {
    const { year, month, day } = toIstDateParts(date);

    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}
