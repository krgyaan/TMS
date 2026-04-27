import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, FileText, Users, Building2, Mail, Phone, User, Clock } from 'lucide-react';
import { useRequestExtension } from '@/hooks/api/useRequestExtension';
import { useTender } from '@/hooks/api/useTenders';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { Client } from '../helpers/requestExtension.types';
import { Separator } from '@/components/ui/separator';

// Client Card Component
const ClientCard = ({ client, index }: { client: Client; index: number }) => (
    <Card className="border-dashed">
        <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                </div>
                <span className="font-medium">{client.name || 'Unnamed Client'}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{client.org || '-'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{client.name || '-'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {client.email ? (
                        <a
                            href={`mailto:${client.email}`}
                            className="font-medium text-primary hover:underline"
                        >
                            {client.email}
                        </a>
                    ) : (
                        <span className="font-medium">-</span>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {client.phone ? (
                        <a
                            href={`tel:${client.phone}`}
                            className="font-medium text-primary hover:underline"
                        >
                            {client.phone}
                        </a>
                    ) : (
                        <span className="font-medium">-</span>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);

// Info Row Component
const InfoRow = ({ icon: Icon, label, value, className = '' }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    className?: string;
}) => (
    <div className={`flex items-start gap-3 ${className}`}>
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium">{value}</div>
        </div>
    </div>
);

const RequestExtensionView = ({ requestId }: { requestId: number }) => {
    const {
        data: requestExtension,
        isLoading,
        error
    } = useRequestExtension(requestId);

    const {
        data: tender,
        isLoading: tenderLoading
    } = useTender(Number(requestExtension?.tenderId));

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
                <AlertTitle>Error loading data</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    // Not found state
    if (!requestExtension) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>
                    Request extension with ID {requestId} was not found.
                </AlertDescription>
            </Alert>
        );
    }


    return (
        <div className="space-y-6">
            {/* Tender Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tender Information</CardTitle>
                </CardHeader>
                <CardContent>
                    {tenderLoading ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <span className="animate-spin mr-2">⏳</span>
                            Loading tender details...
                        </div>
                    ) : tender ? (
                        <div className="grid gap-4 md:grid-cols-3">
                            <InfoRow
                                icon={FileText}
                                label="Tender No."
                                value={tender.tenderNo}
                            />
                            <InfoRow
                                icon={FileText}
                                label="Tender Name"
                                value={tender.tenderName}
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Due Date"
                                value={formatDateTime(tender.dueDate)}
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Tender information not available
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Extension Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Extension Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoRow
                            icon={Clock}
                            label="Days of Extension"
                            value={
                                <span className="text-2xl font-bold text-primary">
                                    {requestExtension.days} days
                                </span>
                            }
                        />
                    </div>

                    <Separator />

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Reason for Extension</span>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="whitespace-pre-wrap">{requestExtension.reason}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Client Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Client Details
                        <Badge variant="secondary">
                            {requestExtension.clients?.length || 0} {(requestExtension.clients?.length || 0) === 1 ? 'client' : 'clients'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {requestExtension.clients && requestExtension.clients.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-3">
                            {requestExtension.clients.map((client, index) => (
                                <ClientCard key={index} client={client} index={index} />
                            ))}
                        </div>
                    ) : (
                        <Alert>
                            <AlertDescription>
                                No client information available.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <InfoRow
                            icon={Calendar}
                            label="Created At"
                            value={requestExtension.createdAt ? formatDateTime(requestExtension.createdAt) : '-'}
                        />
                        <InfoRow
                            icon={Calendar}
                            label="Last Updated"
                            value={requestExtension.updatedAt ? formatDateTime(requestExtension.updatedAt) : '-'}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export function RequestExtensionSection({ requestId }: { requestId: number }) {
    return <RequestExtensionView requestId={requestId} />;
}

export default RequestExtensionView;
