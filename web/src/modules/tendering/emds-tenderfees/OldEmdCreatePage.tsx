import { useSearchParams } from "react-router-dom";
import { OldEmdRequestForm } from "./components/OldEmdRequestForm";

export default function OldEmdCreatePage() {
    const [searchParams] = useSearchParams();
    const defaultMode = searchParams.get('mode') || undefined;
    return (
        <OldEmdRequestForm tenderId={0} mode="create" defaultMode={defaultMode} />
    );
}
