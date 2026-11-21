import { RateLimiter } from "./rate-limiter";

function fakeClock() {
    let current = 0;
    const sleeps: number[] = [];

    return {
        now: () => current,
        sleep: (ms: number) => {
            sleeps.push(ms);
            current += ms;

            return Promise.resolve();
        },
        advance: (ms: number) => {
            current += ms;
        },
        sleeps,
        time: () => current,
    };
}

describe("RateLimiter", () => {
    it("spaces requests at the configured rate", async () => {
        const clock = fakeClock();
        const limiter = new RateLimiter({ rps: 2, maxConcurrency: 1, now: clock.now, sleep: clock.sleep });
        const starts: number[] = [];

        await Promise.all(
            [1, 2, 3].map(() =>
                limiter.schedule(() => {
                    starts.push(clock.time());

                    return Promise.resolve();
                })
            )
        );

        expect(starts).toEqual([0, 500, 1000]);
    });

    it("serialises requests when maxConcurrency is 1", async () => {
        const limiter = new RateLimiter({ rps: 1000, maxConcurrency: 1 });
        let active = 0;
        let maxActive = 0;

        const task = () =>
            limiter.schedule(async () => {
                active += 1;
                maxActive = Math.max(maxActive, active);
                await new Promise(resolve => setTimeout(resolve, 5));
                active -= 1;
            });

        await Promise.all([task(), task(), task()]);

        expect(maxActive).toBe(1);
    });

    it("allows the configured concurrency", async () => {
        const limiter = new RateLimiter({ rps: 1000, maxConcurrency: 2 });
        let active = 0;
        let maxActive = 0;

        const task = () =>
            limiter.schedule(async () => {
                active += 1;
                maxActive = Math.max(maxActive, active);
                await new Promise(resolve => setTimeout(resolve, 10));
                active -= 1;
            });

        await Promise.all([task(), task(), task(), task()]);

        expect(maxActive).toBe(2);
    });

    it("releases the slot when the task throws", async () => {
        const limiter = new RateLimiter({ rps: 1000, maxConcurrency: 1 });

        await expect(limiter.schedule(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");

        await expect(limiter.schedule(() => Promise.resolve("ok"))).resolves.toBe("ok");
    });

    it("validates its options", () => {
        expect(() => new RateLimiter({ rps: 0, maxConcurrency: 1 })).toThrow(/rps/);
        expect(() => new RateLimiter({ rps: 1, maxConcurrency: 0 })).toThrow(/maxConcurrency/);
    });
});
