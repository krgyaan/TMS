import { useParams } from "react-router-dom";

const ViewPOPage = () => {
  const { projectId, poId } = useParams<{ projectId: string; poId: string }>();

  return (
    <div>ViewPOPage (project: {projectId}, po: {poId})</div>
  )
}

export default ViewPOPage