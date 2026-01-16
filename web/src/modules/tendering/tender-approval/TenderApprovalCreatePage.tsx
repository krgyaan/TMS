import { useParams } from 'react-router-dom';
import { TenderApprovalForm } from './components/TenderApprovalForm';
import { useTender } from '@/hooks/api/useTenders';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

export default function TenderApprovalCreatePage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const id = Number(tenderId);

    const { data: tender, isLoading: isTenderLoading } = useTender(id);
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(id);
    const { data: approval, isLoading: isApprovalLoading } = useTenderApproval(id);

    const isPageLoading = isTenderLoading || isInfoSheetLoading || isApprovalLoading;

    return (
        <TenderApprovalForm
            tenderId={id}
            relationships={{ ...tender, infoSheet, approval } as unknown as TenderWithRelations}
            isLoading={isPageLoading}
        />
    );
}
