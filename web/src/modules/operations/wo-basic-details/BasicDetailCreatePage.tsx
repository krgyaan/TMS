import { BasicDetailForm } from "./components/BasicDetailForm";

const BasicDetailCreatePage = () => {
    return (
        <div className="flex flex-col gap-4">
            <BasicDetailForm mode="create" />
        </div>
    );
};

export default BasicDetailCreatePage;
