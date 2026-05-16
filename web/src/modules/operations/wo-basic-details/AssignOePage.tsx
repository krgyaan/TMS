import { useParams } from "react-router-dom";
import { AssignOeForm } from "./components/AssignOeForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWoBasicDetailById } from "@/hooks/api/useWoBasicDetails";
import { useUsersOfOps } from "@/hooks/api/useUsers";

const AssignOePage = () => {
    const { id } = useParams<{ id: string }>();

    if (!id) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                Missing WO Basic Detail ID. Please navigate from the WO Basic Details list.
            </AlertDescription>
        </Alert>
    }

    const { data: existingData, isLoading } = useWoBasicDetailById(Number(id));

    // Only pass team if it is a real number
    const teamId = (!isLoading && existingData?.team != null && !isNaN(Number(existingData.team)))
        ? Number(existingData.team)
        : undefined;

    const { data: users } = useUsersOfOps(teamId);

    if (isLoading) {
        return <Skeleton>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </Skeleton>;
    }

    const mode: "create" | "edit" = (existingData?.oeFirst || existingData?.oeDocsPrep || existingData?.oeSiteVisit) ? "edit" : "create";

    return (
        <div className="flex flex-col gap-4">
            {!existingData?.team &&
                <Alert variant="warning">
                    <AlertDescription>
                        Missing Team in WO Basic Detail. Fetching all the users of Operation team.
                    </AlertDescription>
                </Alert>
            }

            <AssignOeForm mode={mode} existingData={existingData} users={users} />
        </div>
    );
};

export default AssignOePage;
