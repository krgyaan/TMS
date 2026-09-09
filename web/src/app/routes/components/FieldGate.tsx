import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useFieldMode } from "@/hooks/useFieldMode";
import { isFieldPath } from "@/lib/field-mode";

export function FieldGate() {
    const isFieldMode = useFieldMode();
    const location = useLocation();

    if (isFieldMode && !isFieldPath(location.pathname)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
