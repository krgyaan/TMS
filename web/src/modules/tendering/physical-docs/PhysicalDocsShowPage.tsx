import { useParams, useNavigate } from "react-router-dom";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";

export default function PhysicalDocsShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);

    const isLoading = tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading;

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations = {
        ...tender!,
        approval: approval || null,
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="physical-docs" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-4 gap-2">
                    <TabsTrigger value="tender">Tender</TabsTrigger>
                    <TabsTrigger value="info-sheet">Info Sheet</TabsTrigger>
                    <TabsTrigger value="approval">Tender Approval</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                </TabsList>

                {/* Tender */}
                <TabsContent value="tender">
                    <TenderView
                        tender={tenderWithRelations}
                        isLoading={isLoading}
                        showEditButton
                        showBackButton
                        onEdit={() => navigate(paths.tendering.tenderApprovalCreate(tenderId!))}
                        onBack={() => navigate(paths.tendering.tenderApproval)}
                    />
                </TabsContent>

                {/* Info Sheet */}
                <TabsContent value="info-sheet">
                    {infoSheetLoading ? (
                        <InfoSheetView isLoading />
                    ) : infoSheet ? (
                        <InfoSheetView
                            infoSheet={infoSheet}
                            onEdit={() => navigate(paths.tendering.infoSheetEdit(tenderId!))}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No info sheet exists for this tender yet.
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Tender Approval */}
                <TabsContent value="approval">
                    <TenderApprovalView
                        tender={tenderWithRelations}
                        isLoading={isLoading}
                        showEditButton
                        showBackButton
                        onEdit={() => navigate(paths.tendering.tenderApprovalCreate(tenderId!))}
                        onBack={() => navigate(paths.tendering.tenderApproval)}
                    />
                </TabsContent>

                {/* Physical Docs */}
                <TabsContent value="physical-docs">
                    {physicalDocLoading ? (
                        <PhysicalDocsView isLoading={true} physicalDoc={null} />
                    ) : physicalDoc ? (
                        <PhysicalDocsView
                            physicalDoc={physicalDoc}
                            onEdit={() => navigate(paths.tendering.physicalDocsEdit(tenderId!))}
                            onBack={() => navigate(paths.tendering.physicalDocs)}
                        />
                    ) : (
                        <PhysicalDocsView isLoading={false} physicalDoc={null} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
