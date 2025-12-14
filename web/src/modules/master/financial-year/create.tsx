import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const CreateFinancialYearPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(paths.master.financialYears, { replace: true });
    }, [navigate]);

    return null;
}

export default CreateFinancialYearPage;
