import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateEmdResponsibilityPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.emdsResponsibilities, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateEmdResponsibilityPage;
