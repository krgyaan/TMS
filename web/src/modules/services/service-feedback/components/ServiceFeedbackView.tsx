import { FileText, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { StarRatingInput } from "@/components/StarRatingInput";
import { type ServiceFeedback } from "../helpers/service-feedback.types";

const sectionCls = "px-6";
const sectionTitleCls = "text-sm font-semibold flex items-center gap-2 text-foreground mb-4";

function SectionTitle({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return <h3 className={sectionTitleCls}>{icon}{children}</h3>;
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <>
            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">
                {label}
            </TableCell>
            <TableCell className="text-sm font-semibold w-[32%]">
                {value ?? "—"}
            </TableCell>
        </>
    );
}

export function ServiceFeedbackView({ feedback }: { feedback: ServiceFeedback }) {
    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Customer Feedback
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Ticket #{feedback.complaintId} • Feedback #{feedback.id}
                </p>
            </div>

            {/* Feedback Details */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Feedback Details
                </SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell
                                    label="Problem Resolved"
                                    value={
                                        feedback.problemResolved === "1"
                                            ? "Yes"
                                            : feedback.problemResolved === "0"
                                            ? "No"
                                            : "—"
                                    }
                                />
                                <InfoCell
                                    label="Satisfaction"
                                    value={
                                        feedback.satisfaction ? (
                                            <div className="flex items-center gap-2">
                                                <StarRatingInput
                                                    value={feedback.satisfaction}
                                                    readonly
                                                    size="sm"
                                                />
                                                <span className="text-muted-foreground">{feedback.satisfaction} / 5</span>
                                            </div>
                                        ) : (
                                            "—"
                                        )
                                    }
                                />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Suggestions */}
            <div className={sectionCls}>
                <SectionTitle icon={<MessageCircle className="h-4 w-4" />}>
                    Suggestions
                </SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">
                    {feedback.suggestions || "—"}
                </div>
            </div>
        </Card>
    );
}
