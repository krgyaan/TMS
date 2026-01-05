import { OrganizationModal } from "./components/OrganizationModal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

const CreateOrganizationPage = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!open) {
            navigate(paths.master.organizations);
        }
    }, [open, navigate]);

    return <OrganizationDrawer open={open} onOpenChange={setOpen} organization={null} onSuccess={() => navigate(paths.master.organizations)} />;
};

export default CreateOrganizationPage;
