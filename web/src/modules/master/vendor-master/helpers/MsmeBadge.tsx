import { Badge } from "@/components/ui/badge";

export type MsmeType = "M" | "S";

type MsmeBadgeProps = {
    msme?: string | null;
    msmeType?: MsmeType | null;
};

// Number but no type yet -> plain "MSME" on an outline badge, so rows that still
// need a type stand apart from the ones that are definitively NON-MSME.
export function MsmeBadge({ msme, msmeType }: MsmeBadgeProps) {
    if (!msme?.trim()) return <Badge variant="secondary">NON-MSME</Badge>;
    if (msmeType) return <Badge variant="default">MSME ({msmeType})</Badge>;
    return <Badge variant="outline">MSME</Badge>;
}
