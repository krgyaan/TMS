import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateVendorOrganizationPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.vendorOrganizations, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateVendorOrganizationPage;
