import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFdrRequestLetterPreview } from '@/hooks/api/useFdrs';

export default function FdrRequestLetterPreviewPage() {
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch, isFetching } = useFdrRequestLetterPreview();

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Request Letter Format</CardTitle>
                    <CardDescription className="mt-2">
                        Preview of the lien-marking letter sent to Au Small Finance Bank with an FDR request.
                        The values shown are sample data.
                    </CardDescription>
                </div>
                <CardAction>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                            {isFetching ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Regenerate
                        </Button>
                        {data?.url && (
                            <Button variant="outline" onClick={() => window.open(data.url, '_blank', 'noopener')}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in new tab
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex h-[70vh] items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating preview...
                    </div>
                ) : isError || !data?.url ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to generate the request letter preview. Please try again.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <iframe
                        src={data.url}
                        title="FDR Request Letter Preview"
                        className="w-full rounded-md border bg-white"
                        style={{ height: '75vh' }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
