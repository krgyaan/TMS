export interface RateLimiterOptions {
    rps: number;
    maxConcurrency: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Token-bucket rate limiter plus a concurrency gate.
 *
 * Every outgoing Tally call must go through a single shared instance so that
 * immediate calls and queued workers draw from the same budget. With the
 * default maxConcurrency=1 requests are serialised, matching TallyPrime.
 */
export class RateLimiter {
    private readonly rps: number;
    private readonly maxConcurrency: number;
    private readonly now: () => number;
    private readonly sleep: (ms: number) => Promise<void>;

    private nextAllowedAt = 0;
    private active = 0;
    private readonly waiters: Array<() => void> = [];

    constructor(options: RateLimiterOptions) {
        if (!Number.isFinite(options.rps) || options.rps <= 0) {
            throw new Error("RateLimiter rps must be a positive number");
        }

        if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1) {
            throw new Error("RateLimiter maxConcurrency must be an integer >= 1");
        }

        this.rps = options.rps;
        this.maxConcurrency = options.maxConcurrency;
        this.now = options.now ?? Date.now;
        this.sleep = options.sleep ?? defaultSleep;
    }

    async schedule<T>(task: () => Promise<T>): Promise<T> {
        await this.acquireSlot();

        try {
            await this.waitForToken();

            return await task();
        } finally {
            this.releaseSlot();
        }
    }

    private acquireSlot(): Promise<void> {
        if (this.active < this.maxConcurrency) {
            this.active += 1;

            return Promise.resolve();
        }

        return new Promise<void>(resolve => {
            this.waiters.push(() => {
                this.active += 1;
                resolve();
            });
        });
    }

    private releaseSlot(): void {
        this.active -= 1;

        const next = this.waiters.shift();

        if (next) {
            next();
        }
    }

    private async waitForToken(): Promise<void> {
        const interval = 1000 / this.rps;
        const current = this.now();
        const scheduled = Math.max(current, this.nextAllowedAt);

        this.nextAllowedAt = scheduled + interval;

        const delay = scheduled - current;

        if (delay > 0) {
            await this.sleep(delay);
        }
    }
}
