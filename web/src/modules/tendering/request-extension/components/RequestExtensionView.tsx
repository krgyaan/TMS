import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { RequestExtensionResponse } from '../helpers/requestExtension.types';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface RequestExtensionViewProps {
    data?: RequestExtensionResponse;
    isLoading?: boolean;
    error?: Error | null;
}

const RequestExtensionView = ({ data, isLoading, error }: RequestExtensionViewProps) => {
    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Loading request extension details...
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error loading request extension data</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Extension Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Requested Extension Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                    Request Data
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Days of Extension</TableCell>
                                <TableCell className="text-sm font-semibold">{data?.days}</TableCell>
                                <TableCell className="font-medium text-muted-foreground">Reason for Extension</TableCell>
                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>{data?.reason}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                    Client Details
                                </TableCell>
                            </TableRow>
                            {data?.clients?.map((client, index) => (
                                <>
                                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">
                                            Name ({index + 1})
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                        {client.name}
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground">
                                            Email ({index + 1})
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {client.email}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground">
                                            Phone ({index + 1})
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {client.phone}
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground">
                                            Organization ({index + 1})
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {client.org}
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                            <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                    Timeline
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Requested On</TableCell>
                                <TableCell className="text-sm font-semibold">{formatDateTime(data?.createdAt)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export function RequestExtensionSection({ data, isLoading, error }: { data: RequestExtensionResponse; isLoading?: boolean; error?: Error | null }) {
    return <RequestExtensionView data={data} isLoading={isLoading} error={error} />;
}

export default RequestExtensionView;
