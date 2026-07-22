import { useParams } from "react-router-dom";
import { LeadEnquiryForm } from './components/LeadEnquiryForm';

export default function LeadEnquiryCreatePage() {
    const { leadId } = useParams<{ leadId: string }>();
    return <LeadEnquiryForm mode="create" defaultLeadId={leadId ? Number(leadId) : null} />;
}
