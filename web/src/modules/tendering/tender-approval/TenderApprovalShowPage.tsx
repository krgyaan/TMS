import { useParams, useNavigate } from 'react-router-dom';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { TenderApprovalView } from './components/TenderApprovalView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { TenderView } from '../tenders/components/TenderView';

export default function TenderApprovalShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    const { data: tender, isLoading: tenderLoading, error: tenderError } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);

    const isLoading = tenderLoading || approvalLoading;

    // Determine which tabs have data
    const hasInfoSheet = !infoSheetLoading && !!infoSheet;

    if (!tenderId || tenderError || (!tenderLoading && !tender)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.tenderApproval)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations = {
        ...tender!,
        approval: approval || null,
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="approval" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-3 gap-2">
                    <TabsTrigger value="tender">Tender</TabsTrigger>
                    <TabsTrigger value="info-sheet" disabled={!hasInfoSheet && !infoSheetLoading}>
                        Info Sheet
                    </TabsTrigger>
                    <TabsTrigger value="approval">Tender Approval</TabsTrigger>
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
            </Tabs>
        </div>
    );
}
