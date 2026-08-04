import { useParams } from "react-router-dom";
import { AmcCreateForm } from "./components/AmcCreateForm";

export default function AmcEditPage() {
    const { id } = useParams<{ id: string }>();
    const amcId = id ? Number(id) : undefined;

    if (!amcId) {
        return <p className="text-sm text-muted-foreground">Invalid AMC ID.</p>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <AmcCreateForm key={amcId} amcId={amcId} />
        </div>
    );
}