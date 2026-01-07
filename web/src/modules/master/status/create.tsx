import { StatusModal } from "./components/StatusModal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

const CreateStatusPage = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!open) {
            navigate(paths.master.statuses);
        }
    }, [open, navigate]);

    return <StatusDrawer open={open} onOpenChange={setOpen} status={null} onSuccess={() => navigate(paths.master.statuses)} />;
};

export default CreateStatusPage;
