import { useParams, useNavigate } from 'react-router-dom';
import { useTender } from '@/hooks/api/useTenders';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { TenderView } from './components/TenderView';
import { InfoSheetView } from '../info-sheet/components/InfoSheetView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;
    const { data: tender, isLoading, error } = useTender(tenderId);
    const {
        data: infoSheet,
        isLoading: infoSheetLoading,
        error: infoSheetError,
    } = useInfoSheet(tenderId);

    if (!tenderId || error || (!isLoading && !tender)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.tenders)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="tender" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="tender">Tender Details</TabsTrigger>
                    <TabsTrigger value="info-sheet">Info Sheet Details</TabsTrigger>
                </TabsList>

                <TabsContent value="tender">
                    <TenderView
                        tender={tender!}
                        isLoading={isLoading}
                        showEditButton
                        showBackButton
                        onEdit={() => navigate(paths.tendering.tenderEdit(tenderId!))}
                        onBack={() => navigate(paths.tendering.tenders)}
                    />
                </TabsContent>

                <TabsContent value="info-sheet" className="space-y-4">
                    {infoSheetLoading ? (
                        <InfoSheetView isLoading />
                    ) : infoSheet ? (
                        <InfoSheetView
                            infoSheet={infoSheet}
                            tender={tender ?? null}
                            onEdit={() => navigate(paths.tendering.infoSheetCreate(tenderId!))}
                        />
                    ) : infoSheetError ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load info sheet details. Please try again later.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No info sheet exists for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.infoSheetCreate(tenderId!))}>
                                    Fill Info Sheet
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
