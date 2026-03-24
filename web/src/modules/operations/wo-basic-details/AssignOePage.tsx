import { AssignOeForm } from "./components/AssignOeForm";

const AssignOePage = () => {
    return (
        <div className="flex flex-col gap-4">
            <AssignOeForm mode="create" />
        </div>
    );
};

export default AssignOePage;
