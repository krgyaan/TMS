/**
 * Shared layout for tender step pages: renders the step accordion with an
 * automatic right-side tender status history panel.
 */
import type { ReactNode } from "react";
import { ShowPageLayout, type ShowPageLayoutProps } from "@/components/layout/ShowPageLayout";
import { TenderStatusHistoryPanel } from "@/modules/tendering/tenders/components/TenderStatusHistoryPanel";

export type TenderStepsPageLayoutProps = Omit<ShowPageLayoutProps, "rightPanel"> & {
    tenderId: number | null;
    /** Set to false to hide the status history panel (e.g. non-tender flows). */
    showStatusHistory?: boolean;
    rightPanel?: ReactNode;
};

export function TenderStepsPageLayout({
    tenderId,
    showStatusHistory = true,
    rightPanel,
    ...layoutProps
}: TenderStepsPageLayoutProps) {
    const hasTender = tenderId !== null && tenderId !== undefined && tenderId > 0;

    const panel =
        rightPanel !== undefined
            ? rightPanel
            : showStatusHistory && hasTender
                ? <TenderStatusHistoryPanel tenderId={tenderId} />
                : undefined;

    return <ShowPageLayout {...layoutProps} rightPanel={panel} />;
}

export default TenderStepsPageLayout;
