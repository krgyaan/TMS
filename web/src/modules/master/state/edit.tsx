import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const EditStatePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to main page - drawer will be opened from there
        navigate(paths.master.states, { replace: true });
    }, [navigate]);

    return null;
}

export default EditStatePage;
