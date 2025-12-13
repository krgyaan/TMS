import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateFollowupCategoryPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.followupCategories, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateFollowupCategoryPage;
