import { useParams, useNavigate } from "react-router-dom";
import { EnquiryResultViewPage } from "./EnquiryResultViewPage";

export default function EnquiryResultShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const resultId = id ? Number(id) : NaN;
    if (isNaN(resultId)) {
        return <div className="p-6 text-destructive">Invalid enquiry result ID.</div>;
    }

    return (
        <EnquiryResultViewPage
            resultId={resultId}
            onBack={() => navigate('/crm/enquiry-results')}
            backLabel="Back to Enquiry Results"
        />
    );
}
