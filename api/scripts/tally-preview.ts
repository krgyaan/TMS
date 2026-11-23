import "dotenv/config";
import { createDb, createPool } from "../src/db";
import { toIstIsoDate } from "../src/modules/integrations/tally/dates/ist-date";
import { formatTallyAmount } from "../src/modules/integrations/tally/money/paise";
import { ImprestVoucherSource } from "../src/modules/integrations/tally/sources/imprest-voucher.source";

const USAGE = `Usage: pnpm tally:preview --from=YYYY-MM-DD --to=YYYY-MM-DD

Lists accounts-signed imprest vouchers in the range, their posting lines and
any blocking problems. Read-only: it never calls TallyPrime. Exits non-zero
when any voucher is not postable.`;

function fail(message: string): never {
    console.error(message);
    process.exit(2);
}

function parseDateArg(name: string, value: string | undefined): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        fail(`${name} must be a date in YYYY-MM-DD form`);
    }

    const parsed = new Date(`${value}T00:00:00.000+05:30`);

    if (Number.isNaN(parsed.getTime()) || toIstIsoDate(parsed) !== value) {
        fail(`${name} is not a valid calendar date`);
    }

    return value;
}

function parseArgs(argv: string[]): { from: string; to: string } {
    const values = new Map<string, string>();

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === "--help" || arg === "-h") {
            console.log(USAGE);
            process.exit(0);
        }

        if (!arg.startsWith("--")) {
            fail(`Unexpected argument: ${arg}`);
        }

        const [key, inline] = arg.slice(2).split("=", 2);

        if (inline !== undefined) {
            values.set(key, inline);
            continue;
        }

        const next = argv[index + 1];

        if (next === undefined || next.startsWith("--")) {
            fail(`Missing value for --${key}`);
        }

        values.set(key, next);
        index += 1;
    }

    const from = parseDateArg("--from", values.get("from"));
    const to = parseDateArg("--to", values.get("to"));

    if (from > to) {
        fail("--from must be on or before --to");
    }

    return { from, to };
}

async function main(): Promise<void> {
    const { from, to } = parseArgs(process.argv.slice(2));
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        fail("DATABASE_URL is not set");
    }

    const pool = createPool(databaseUrl);
    const db = createDb(pool);

    try {
        const source = new ImprestVoucherSource(db);
        const snapshots = await source.listSnapshots({
            from: new Date(`${from}T00:00:00.000+05:30`),
            to: new Date(`${to}T23:59:59.999+05:30`),
        });

        const vouchers = snapshots.map(snapshot => ({
            voucherId: snapshot.voucherId,
            voucherCode: snapshot.voucherCode,
            employee: snapshot.employeeName ?? snapshot.employeeId,
            voucherDate: snapshot.voucherDate,
            period: { from: snapshot.validFrom, to: snapshot.validTo },
            creditLedger: snapshot.creditLedger,
            total: formatTallyAmount(snapshot.totalPaise),
            stored: snapshot.storedAmountPaise === null ? null : formatTallyAmount(snapshot.storedAmountPaise),
            postable: snapshot.postable,
            problems: snapshot.problems.map(problem => ({
                code: problem.code,
                imprestId: problem.imprestId ?? null,
                message: problem.message,
            })),
        }));

        const blocked = vouchers.filter(voucher => !voucher.postable).length;

        console.log(
            JSON.stringify(
                {
                    from,
                    to,
                    count: vouchers.length,
                    postable: vouchers.length - blocked,
                    blocked,
                    vouchers,
                },
                null,
                2
            )
        );

        if (blocked > 0) {
            console.error(
                `${blocked} voucher(s) are not postable. Resolve the problems above; UNMAPPED_CATEGORY means the category is absent from categoryLedgers in mappings/imprest-tally.config.ts.`
            );
            process.exitCode = 1;
        }
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
