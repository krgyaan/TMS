import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Eye, Info } from "lucide-react";
import { useStageBacklogV2 } from "../tender-executive.hooks";
import { paths } from "@/app/routes/paths";

/* =====================================
   DOCUMENTATION-DRIVEN ROW DEFINITIONS
===================================== */

export const DOC_TABLE = [
    /* ================= ASSIGNMENT ================= */
    {
        section: "Tender Assignment Scores",
        rows: [
            {
                label: "Tenders assigned but pending at start of period",
                stage: "assigned",
                bucket: "opening",
            },
            {
                label: "Tenders assigned during the period",
                stage: "assigned",
                bucket: "during.total",
            },
            {
                label: "Tender info filled during the period",
                stage: "assigned",
                bucket: "during.completed",
            },
            {
                label: "Tender info pending at end of period",
                stage: "assigned",
                bucket: "total",
            },
        ],
    },

    /* ================= APPROVAL ================= */
    {
        section: "Tender Approval Scores",
        rows: [
            {
                label: "Tender approval pending at start of period",
                stage: "approved",
                bucket: "opening",
            },
            {
                label: "Tender info filled during the period",
                stage: "approved",
                bucket: "during.completed",
            },
            {
                label: "Tenders approved during the period",
                stage: "approved",
                bucket: "during.completed",
            },
            {
                label: "Tender approval pending at end of period",
                stage: "approved",
                bucket: "total",
            },
        ],
    },

    /* ================= SUBMISSION ================= */
    {
        section: "Tender Submission Scores",
        rows: [
            {
                label: "Tenders approved but bid pending at start",
                stage: "bid",
                bucket: "opening",
            },
            {
                label: "Tenders approved during the period",
                stage: "bid",
                bucket: "during.total",
            },
            {
                label: "Tenders missed during the period",
                stage: "bid",
                bucket: "during.pending",
                color: "red",
            },
            {
                label: "Tenders bid during the period",
                stage: "bid",
                bucket: "during.completed",
                color: "green",
            },
            {
                label: "Tenders approved but bid pending at end",
                stage: "bid",
                bucket: "total",
                color: "yellow",
            },
        ],
    },

    /* ================= RESULT ================= */
    {
        section: "Tender Result Scores",
        rows: [
            {
                label: "Tender result awaited at start",
                stage: "resultAwaited",
                bucket: "opening",
            },
            {
                label: "Tenders bid during the period",
                stage: "bid",
                bucket: "during.completed",
            },
            {
                label: "Tender results received during the period",
                stage: "resultAwaited",
                bucket: "during.completed",
            },
            {
                label: "Tenders disqualified during the period",
                stage: "disqualified",
                bucket: "during.disqualified",
                color: "red",
            },
            {
                label: "Tender result awaited at end",
                stage: "resultAwaited",
                bucket: "total",
                color: "yellow",
            },
        ],
    },

    /* ================= WON ================= */
    {
        section: "Tenders Won Scores",
        rows: [
            {
                label: "Tenders won before the period",
                stage: "won",
                bucket: "opening",
                color: "green",
            },
            {
                label: "Tenders won during the period",
                stage: "won",
                bucket: "during.completed",
                color: "green",
            },
        ],
    },

    /* ================= LOST ================= */
    {
        section: "Tenders Lost Scores",
        rows: [
            {
                label: "Tenders lost before the period",
                stage: "lost",
                bucket: "opening",
                color: "red",
            },
            {
                label: "Tenders lost during the period",
                stage: "lost",
                bucket: "during.completed",
                color: "red",
            },
        ],
    },
];

/* ================================
   HELPERS
================================ */

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

type MetricVariant = "default" | "strong" | "positive" | "negative" | "warning";

/* ================================
   METRIC CELL
================================ */

export function MetricCell({ data, variant = "default" }: { data: any; variant?: MetricVariant }) {
    if (!data || data.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    const variantClass = {
        default: "bg-muted text-foreground",
        strong: "bg-primary/10 text-primary",
        positive: "bg-emerald-100 text-emerald-700",
        negative: "bg-rose-100 text-rose-700",
        warning: "bg-yellow-100 text-yellow-800",
    }[variant];

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className={`
              mx-auto flex flex-col items-center justify-center
              min-w-[72px] px-3 py-1.5 rounded-xl cursor-pointer
              text-sm font-bold
              ${variantClass}
            `}
                    >
                        <span>{data.count}</span>
                        <span className="text-[11px] font-normal opacity-80">{formatCurrency(data.value)}</span>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {data.count} EMDs · {formatCurrency(data.value)}
                        </div>

                        {data.drilldown?.map((e: any) => (
                            <div key={`${e.tenderId}-${e.instrumentType}`} className="border-b pb-2 text-xs flex justify-between gap-2">
                                <div className="min-w-0 space-y-0.5">
                                    <div className="font-medium truncate">{e.tenderNo ?? `Tender #${e.tenderId}`}</div>

                                    {e.tenderName && <div className="text-muted-foreground truncate">{e.tenderName}</div>}

                                    <div className="whitespace-nowrap">
                                        {e.instrumentType} · {formatCurrency(e.amount)}
                                    </div>
                                </div>

                                <button
                                    onClick={ev => {
                                        ev.stopPropagation();
                                        window.open(paths.tendering.tenderView(e.tenderId), "_blank");
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-md
                             text-muted-foreground hover:text-primary hover:bg-muted"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
}

function resolveBucket(stage: any, path: string) {
    return path.split(".").reduce((acc, key) => acc?.[key], stage);
}
/* ================================
   COLOR → VARIANT MAP
================================ */

const COLOR_TO_VARIANT = {
    green: "positive",
    red: "negative",
    yellow: "warning",
} as const;

/* ================================
   TABLE
================================ */

export function StageBacklogV3Table(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useStageBacklogV2(props);
    if (!data) return null;

    const { stages } = data;

    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead className="text-center">Count / Value</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {DOC_TABLE.map(section => (
                            <Fragment key={section.section}>
                                {/* SECTION HEADER */}
                                <TableRow>
                                    <TableCell colSpan={2} className="bg-muted/40 font-semibold text-sm">
                                        {section.section}
                                    </TableCell>
                                </TableRow>

                                {/* SECTION ROWS */}
                                {section.rows.map(row => {
                                    const stage = stages[row.stage];
                                    const bucket = resolveBucket(stage, row.bucket);

                                    return (
                                        <TableRow key={row.label} className="hover:bg-muted/20">
                                            <TableCell className="text-sm">{row.label}</TableCell>

                                            <MetricCell data={bucket} variant={row.color ? COLOR_TO_VARIANT[row.color] : "default"} />
                                        </TableRow>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
