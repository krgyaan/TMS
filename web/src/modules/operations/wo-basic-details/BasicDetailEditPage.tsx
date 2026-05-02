import { useParams } from "react-router-dom";
import { BasicDetailForm } from "./components/BasicDetailForm";
import { useWoBasicDetailById } from "@/hooks/api/useWoBasicDetails";
import { Skeleton } from "@/components/ui/skeleton";

const BasicDetailEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: woBasicDetail, isLoading } = useWoBasicDetailById(Number(id));

    if (isLoading) {
        return <Skeleton>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </Skeleton>;
    }

    return (
        <div className="flex flex-col gap-4">
            <BasicDetailForm mode="edit" existingData={woBasicDetail} />
        </div>
    );
};

export default BasicDetailEditPage;
