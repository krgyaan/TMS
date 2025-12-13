import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const EditLeadTypePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.leadTypes, { replace: true });
    }, [navigate]);

    return null;
}

export default EditLeadTypePage;
