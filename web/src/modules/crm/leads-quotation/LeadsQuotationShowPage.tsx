import { useParams, useNavigate } from "react-router-dom";
import { LeadsQuotationViewPage } from "./LeadsQuotationViewPage";
import { paths } from "@/app/routes/paths";

const LeadsQuotationShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const quoteId = id ? Number(id) : null;

    if (!quoteId || isNaN(quoteId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid quotation ID</p>
                <button onClick={() => navigate(paths.crm.leadsQuotations)}>Back to Quotations</button>
            </div>
        );
    }

    return (
        <LeadsQuotationViewPage
            quoteId={quoteId}
            onBack={() => navigate(paths.crm.leadsQuotations)}
            backLabel="Back to Quotations"
        />
    );
};

export default LeadsQuotationShowPage;
