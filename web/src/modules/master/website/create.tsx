import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateWebsitePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.websites, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateWebsitePage;
