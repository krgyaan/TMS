import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWoAcceptanceDetails, useSubmitAcceptanceDecision } from '@/hooks/api/useWoAcceptance';
import { WoAcceptanceForm } from './components/WoAcceptanceForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { WoAcceptanceFormValues } from './helpers/wo-acceptance.types';
import type { WoAcceptanceDecisionDto } from '@/modules/operations/types/wo.types';

const WoAcceptancePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woDetailId = id ? parseInt(id, 10) : 0;

    const { data: details, isLoading, error } = useWoAcceptanceDetails(woDetailId);
    const { mutate: submitDecision, isPending: isSubmitting } = useSubmitAcceptanceDecision();

    const handleSubmit = (values: WoAcceptanceFormValues) => {
        const dto: WoAcceptanceDecisionDto = {
            decision: values.decision,
            remarks: values.remarks,
            amendments: values.amendments?.map(am => ({
                pageNo: am.pageNo || '',
                clauseNo: am.clauseNo || '',
                currentStatement: am.currentStatement || '',
                correctedStatement: am.correctedStatement || '',
            })),
            initiateFollowUp: values.initiateFollowUp === 'true',
            oeSiteVisitId: values.oeSiteVisitId ? parseInt(values.oeSiteVisitId, 10) : null,
            oeDocsPrepId: values.oeDocsPrepId ? parseInt(values.oeDocsPrepId, 10) : null,
            signedWoFilePath: values.signedWoFilePath,
        };

        submitDecision({ woDetailId, data: dto }, {
            onSuccess: () => {
                navigate('/operations/wo-details');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-[500px] w-full rounded-xl" />
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Failed to load WO acceptance details. Please ensure the WO ID is valid.'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { detail, oeAmendments } = details;

    return (
        <WoAcceptanceForm
            initialData={{
                projectName: detail.projectName,
                woNumber: detail.woNumber,
                projectCode: detail.projectCode,
                clientName: detail.clientName,
                oeAmendments: oeAmendments || [],
            }}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isSubmitting={isSubmitting}
        />
    );
};

export default WoAcceptancePage;
