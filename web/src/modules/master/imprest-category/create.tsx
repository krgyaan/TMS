import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateImprestCategoryPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.imprestCategories, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateImprestCategoryPage;
