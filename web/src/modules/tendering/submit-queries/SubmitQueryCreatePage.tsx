import { useParams } from 'react-router-dom';
import { SubmitQueryForm } from './components/SubmitQueryForm';

export function SubmitQueryCreatePage() {
    const { tenderId } = useParams<{ tenderId: string }>();

    return (
        <div className="container mx-auto py-6">
            <SubmitQueryForm
                mode="create"
                tenderId={tenderId ? parseInt(tenderId, 10) : undefined}
            />
        </div>
    );
}

export default SubmitQueryCreatePage;
