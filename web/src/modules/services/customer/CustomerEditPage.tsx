import { useParams } from "react-router-dom";
import { CustomerCreateForm } from "./components/CustomerCreateForm";

export default function CustomerEditPage() {
    const { id } = useParams<{ id: string }>();
    const complaintId = id ? Number(id) : undefined;

    if (!complaintId) {
        return <p className="text-sm text-muted-foreground">Invalid complaint ID.</p>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <CustomerCreateForm key={complaintId} complaintId={complaintId} />
        </div>
    );
}
