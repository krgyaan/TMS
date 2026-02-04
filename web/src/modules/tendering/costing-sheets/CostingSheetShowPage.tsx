import { useParams, useNavigate } from "react-router-dom";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useTender } from "@/hooks/api/useTenders";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { CostingSheetView } from "./components/CostingSheetView";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";

export default function CostingSheetShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return <div>Invalid tender ID</div>;
    }
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);

    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId!);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId!);

    const isLoading = tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || requestsLoading || costingSheetLoading;

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations = {
        ...tender!,
        approval: approval || null,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(paths.tendering.costingSheets)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-5 gap-2">
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD & Tender Fees</TabsTrigger>
                    <TabsTrigger value="document-checklist">Document Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing Details</TabsTrigger>
                </TabsList>

                {/* Tender Details - Merged Tender, Info Sheet, and Approval */}
                <TabsContent value="tender-details" className="space-y-6">
                    <TenderView
                        tender={tenderWithRelations}
                        isLoading={isLoading}
                    />
                    {infoSheetLoading ? (
                        <InfoSheetView isLoading />
                    ) : infoSheet ? (
                        <InfoSheetView infoSheet={infoSheet} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No info sheet exists for this tender yet.
                            </AlertDescription>
                        </Alert>
                    )}
                    <TenderApprovalView
                        tender={tenderWithRelations}
                        isLoading={isLoading}
                    />
                </TabsContent>

                {/* Physical Docs */}
                <TabsContent value="physical-docs">
                    {physicalDocLoading ? (
                        <PhysicalDocsView isLoading={true} physicalDoc={null} />
                    ) : physicalDoc ? (
                        <PhysicalDocsView physicalDoc={physicalDoc} />
                    ) : (
                        <PhysicalDocsView isLoading={false} physicalDoc={null} />
                    )}
                </TabsContent>

                {/* EMD & Tender Fees */}
                <TabsContent value="emds-tenderfees">
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={isLoading}
                    />
                </TabsContent>

                {/* Document Checklist */}
                <TabsContent value="document-checklist">
                    <DocumentChecklistView
                        checklist={documentChecklist}
                        isLoading={documentChecklistLoading}
                    />
                </TabsContent>

                {/* Costing Details */}
                <TabsContent value="costing-details">
                    <CostingSheetView
                        costingSheet={costingSheet}
                        isLoading={isLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
