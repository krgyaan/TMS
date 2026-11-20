export type TallyErrorCode =
    | "DISABLED"
    | "UNREACHABLE"
    | "TIMEOUT"
    | "AUTH"
    | "RATE_LIMITED"
    | "PROTOCOL"
    | "COMPANY_NOT_OPEN"
    | "COMPANY_MISMATCH"
    | "LINE_ERROR"
    | "UNKNOWN_OUTCOME"
    | "MASTER_CONFLICT"
    | "VALIDATION";

export interface TallyErrorOptions {
    retryable?: boolean;
    details?: Record<string, unknown>;
    cause?: unknown;
}

/**
 * Base error for every Tally failure. Messages are safe to log: they never
 * include the auth token or the request payload.
 */
export class TallyError extends Error {
    readonly code: TallyErrorCode;
    readonly retryable: boolean;
    readonly details?: Record<string, unknown>;

    constructor(code: TallyErrorCode, message: string, options: TallyErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.retryable = options.retryable ?? false;
        this.details = options.details;

        if (options.cause !== undefined) {
            (this as { cause?: unknown }).cause = options.cause;
        }
    }
}

export class TallyDisabledError extends TallyError {
    constructor() {
        super("DISABLED", "Tally integration is disabled (TALLY_ENABLED=false)");
    }
}

export class TallyUnreachable extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("UNREACHABLE", message, { retryable: true, ...options });
    }
}

export class TallyTimeout extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("TIMEOUT", message, { retryable: true, ...options });
    }
}

export class TallyAuthError extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("AUTH", message, { retryable: false, ...options });
    }
}

export class TallyRateLimited extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("RATE_LIMITED", message, { retryable: true, ...options });
    }
}

export class TallyProtocolError extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("PROTOCOL", message, { retryable: false, ...options });
    }
}

export class TallyCompanyNotOpen extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("COMPANY_NOT_OPEN", message, { retryable: true, ...options });
    }
}

export class TallyCompanyMismatch extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("COMPANY_MISMATCH", message, { retryable: false, ...options });
    }
}

export class TallyLineError extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("LINE_ERROR", message, { retryable: false, ...options });
    }
}

export class TallyUnknownOutcome extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("UNKNOWN_OUTCOME", message, { retryable: false, ...options });
    }
}

export class TallyMasterConflict extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("MASTER_CONFLICT", message, { retryable: false, ...options });
    }
}

export class TallyValidationError extends TallyError {
    constructor(message: string, options: TallyErrorOptions = {}) {
        super("VALIDATION", message, { retryable: false, ...options });
    }
}

export const isTallyError = (error: unknown): error is TallyError => error instanceof TallyError;

export const isRetryableTallyError = (error: unknown): boolean => isTallyError(error) && error.retryable;
