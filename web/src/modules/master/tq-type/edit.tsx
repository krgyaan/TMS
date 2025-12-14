import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const EditTqTypePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.tqTypes, { replace: true });
    }, [navigate]);

    return null;
}

export default EditTqTypePage;
