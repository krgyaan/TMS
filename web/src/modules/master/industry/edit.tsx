import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const EditIndustryPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.industries, { replace: true });
    }, [navigate]);

    return null;
}

export default EditIndustryPage;
