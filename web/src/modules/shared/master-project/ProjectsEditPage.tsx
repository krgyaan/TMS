import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasterProject } from "@/hooks/api/useMasterProjects";
import MasterProjectForm from "./components/MasterProjectForm";

const ProjectsEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const projectId = id ? parseInt(id, 10) : null;
    const { data: existingData, isLoading, error } = useMasterProject(projectId);

    if (projectId == null || (id && isNaN(projectId))) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Project ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load project. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <MasterProjectForm mode="edit" existingData={existingData ?? undefined} />
        </div>
    );
};

export default ProjectsEditPage;
