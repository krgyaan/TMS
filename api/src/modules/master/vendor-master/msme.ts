// A real MSME number must match the Udyam registration format.
// Kept in sync with web/src/modules/master/vendor-master/helpers/msme.ts.
const REAL_MSME_PATTERN = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export function isRealMsmeNumber(value?: string | null): boolean {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) return false;
    return REAL_MSME_PATTERN.test(normalized);
}
