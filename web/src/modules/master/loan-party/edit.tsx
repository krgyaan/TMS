import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const EditLoanPartyPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.loanParties, { replace: true });
    }, [navigate]);

    return null;
}

export default EditLoanPartyPage;
