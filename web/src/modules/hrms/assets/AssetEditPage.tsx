import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paths } from "@/app/routes/paths";
import AssetForm from "./components/AssetForm";

export default function AssetEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);

  if (!id || Number.isNaN(assetId)) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Invalid asset ID</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assets.list)}>
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AssetForm mode="edit" assetId={assetId} />;
}
