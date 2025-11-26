import { useParams, useNavigate } from "react-router-dom";
import { EmdTenderFeeShow } from "./components/EmdTenderFeeShow";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useTender } from "@/hooks/api/useTenders";
import { paths } from "@/app/routes/paths";

export default function EmdShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return <div>Invalid tender ID</div>;
    }

    const tenderId = Number(id);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);

    const isLoading = requestsLoading || tenderLoading;

    const handleEdit = () => {
        navigate(paths.tendering.emdsTenderFeesEdit(tenderId));
    };

    const handleBack = () => {
        navigate(paths.tendering.emdsTenderFees);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <EmdTenderFeeShow
                paymentRequests={paymentRequests || null}
                tender={tender || null}
                isLoading={isLoading}
                onEdit={handleEdit}
                onBack={handleBack}
            />
        </div>
    );
}
