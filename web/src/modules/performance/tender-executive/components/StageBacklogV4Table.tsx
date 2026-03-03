import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStageBacklogV2 } from "../tender-executive.hooks";
import { MetricCell } from "./MetricCell";
import { ColumnHeader } from "./emd-helpers";

/* ================================
   SHARED ROW
================================ */

function MetricRow({ label, bucket, color }: { label: string; bucket?: any; color?: "green" | "red" | "yellow" }) {
    return (
        <TableRow>
            <TableCell className="font-medium w-[65%]">{label}</TableCell>
            <MetricCell bucket={bucket} color={color} />
        </TableRow>
    );
}

/* ================================
   ASSIGNMENT
================================ */

function AssignmentTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at Start" description="Tenders assigned but pending at the start of the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Assigned During" description="Tenders assigned during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Info Filled" description="Tender Info filled during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending During" description="Tender Info pending at the end of the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at End" description="Tender Info pending at the end of the period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tender Assignment</TableCell>

                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.total} />
                            <MetricCell data={stage.during.completed} />
                            <MetricCell data={stage.during.pending} />
                            <MetricCell data={stage.total} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ================================
   APPROVAL
================================ */

function ApprovalTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at Start" description="Tender approval pending at the start of the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Info Filled" description="Tender Info filled during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Approved" description="Tenders approved during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Rejected" description="Tenders rejected during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at End" description="Tender approval pending at the end of the period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tender Approval</TableCell>

                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.total} />
                            <MetricCell data={stage.during.completed} />
                            <MetricCell data={stage.during.rejected} />
                            <MetricCell data={stage.total} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ================================
   BID / SUBMISSION
================================ */

function BidTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at Start" description="Approved but bid submission pending at the start of the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Approved During" description="Tenders approved during the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Bid Submitted" description="Tenders bid during the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Missed" description="Tenders missed during the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Pending at End" description="Approved but bidding pending at the end of the period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tender Submission</TableCell>

                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.total} />
                            <MetricCell data={stage.during.completed} />
                            <MetricCell data={stage.during.pending} />
                            <MetricCell data={stage.total} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ================================
   RESULT AWAITED
================================ */

function ResultTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Awaited at Start" description="Tender Result awaited at the start of the period  (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Bid During" description="Tenders Bid during the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Result Received" description="Tender Results received during the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Disqualified" description="Tenders disqualified during the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Awaited at End" description="Tender Result awaited at the end of the period (Final Price)" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tender Results</TableCell>

                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.total} />
                            <MetricCell data={stage.during.completed} />
                            <MetricCell data={stage.during.pending} />
                            <MetricCell data={stage.total} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ================================
   WON
================================ */

function WonTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Won Before Period" description="Tenders won before the start of the period (Final Price)" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Won During Period" description="Tenders won for tenders bid during the period (Final Price)" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tenders Won</TableCell>
                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.completed} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
/* ================================
   LOST
================================ */

function LostTable({ stage }: { stage: any }) {
    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />

                            <TableHead className="text-center">
                                <ColumnHeader title="Lost Before Period" description="Tenders Lost for tender bids before the start of the period (Final Price)" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="Lost During Period" description="Tenders Lost for tenders bid during the period (Final Price)" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">Tenders Lost</TableCell>

                            <MetricCell data={stage.opening} />
                            <MetricCell data={stage.during.completed} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/* ================================
   FINAL PAGE EXPORT
================================ */

export function StageBacklogV4Table(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useStageBacklogV2(props);
    if (!data) return null;

    const { stages } = data;

    return (
        <div className="space-y-6">
            <AssignmentTable stage={stages.assigned} />
            <ApprovalTable stage={stages.approved} />
            <BidTable stage={stages.bid} />
            <ResultTable stage={stages.resultAwaited} />
            <WonTable stage={stages.won} />
            <LostTable stage={stages.lost} />
        </div>
    );
}
