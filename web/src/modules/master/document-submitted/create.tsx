import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateDocumentSubmittedPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.documentSubmitted, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateDocumentSubmittedPage;
