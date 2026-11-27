import { useSearchParams } from "react-router-dom";
import { BasicDetailBatchForm } from "./components/BasicDetailBatchForm";
import { BasicDetailForm } from "./components/BasicDetailForm";

const BasicDetailCreatePage = () => {
    const [searchParams] = useSearchParams();
    const tenderId = searchParams.get("tenderId");

    return (
        <div className="flex flex-col gap-4">
            {tenderId ? <BasicDetailBatchForm /> : <BasicDetailForm mode="create" />}
        </div>
    );
};

export default BasicDetailCreatePage;
