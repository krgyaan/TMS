import { useParams } from 'react-router-dom';
import { WoRaiseQueryForm } from './components/WoRaiseQueryForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WoRaiseQueryPage = () => {
    const { id } = useParams<{ id: string }>();
    const woDetailsId = Number(id);

    if (!woDetailsId) {
        return <Alert>
            <AlertTitle>Invalid WO Detail ID</AlertTitle>
            <AlertDescription>Please provide a valid WO Detail ID.</AlertDescription>
        </Alert>;
    }

    return <WoRaiseQueryForm woDetailsId={woDetailsId} />;
};

export default WoRaiseQueryPage;
