import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileQuestion, Users, Mail, Phone, Building2 } from 'lucide-react';
import type { SubmitQueryResponse } from '../helpers/submitQueries.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface SubmitQueryViewProps {
    data: SubmitQueryResponse;
    isLoading?: boolean;
    error?: Error | null;
}

// Query type badge variant mapping
const queryTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    technical: 'default',
    commercial: 'secondary',
    bec: 'outline',
    price_bid: 'destructive',
};

// Query type label mapping
const queryTypeLabels: Record<string, string> = {
    technical: 'Technical',
    commercial: 'Commercial',
    bec: 'BEC',
    price_bid: 'Price Bid Format',
};

export function SubmitQueryView({ data, isLoading, error }: SubmitQueryViewProps) {
    const navigate = useNavigate();

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error loading submit query</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Loading...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Alert>
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>Submit query not found.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Submit Query Details</CardTitle>
                            <CardDescription className="mt-2">
                                Query ID: #{data.id}
                            </CardDescription>
                        </div>
                        <CardAction className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate(-1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </CardAction>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Tender Info */}
                    <div className="p-4 bg-muted rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-muted-foreground">Tender No:</span>
                                <p className="mt-1 font-medium">{data.tenderNo || '-'}</p>
                            </div>
                            <div className="lg:col-span-2">
                                <span className="font-semibold text-muted-foreground">Tender Name:</span>
                                <p className="mt-1 font-medium">{data.tenderName || '-'}</p>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground">Submitted On:</span>
                                <p className="mt-1 font-medium">{formatDateTime(data.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Queries Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Queries</CardTitle>
                        <Badge variant="secondary">{data.queries?.length || 0}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.queries && data.queries.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center">#</TableHead>
                                        <TableHead className="w-[100px]">Page No.</TableHead>
                                        <TableHead className="w-[100px]">Clause No.</TableHead>
                                        <TableHead className="w-[140px]">Query Type</TableHead>
                                        <TableHead>Current Statement</TableHead>
                                        <TableHead>Requested Statement</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.queries.map((query, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="text-center font-medium">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>{query.pageNo}</TableCell>
                                            <TableCell>{query.clauseNo}</TableCell>
                                            <TableCell>
                                                <Badge variant={queryTypeBadgeVariant[query.queryType] || 'default'}>
                                                    {queryTypeLabels[query.queryType] || query.queryType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[250px]">
                                                <p className="whitespace-pre-wrap text-sm">
                                                    {query.currentStatement}
                                                </p>
                                            </TableCell>
                                            <TableCell className="max-w-[250px]">
                                                <p className="whitespace-pre-wrap text-sm">
                                                    {query.requestedStatement}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <Alert>
                            <AlertDescription>No queries found.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Client Contacts Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Client Contacts</CardTitle>
                        <Badge variant="secondary">{data.clientContacts?.length || 0}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.clientContacts && data.clientContacts.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {data.clientContacts.map((contact, index) => (
                                <Card key={index} className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <Badge variant="outline">Contact {index + 1}</Badge>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Organization */}
                                            <div className="flex items-start gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Organization</p>
                                                    <p className="font-medium">{contact.client_org}</p>
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="flex items-start gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Contact Person</p>
                                                    <p className="font-medium">{contact.client_name}</p>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="flex items-start gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Email</p>
                                                    <a
                                                        href={`mailto:${contact.client_email}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {contact.client_email}
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Phone */}
                                            <div className="flex items-start gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Phone</p>
                                                    <a
                                                        href={`tel:${contact.client_phone}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {contact.client_phone}
                                                    </a>
                                                </div>
                                            </div>

                                            {/* CC Emails */}
                                            {contact.cc_emails && contact.cc_emails.length > 0 && (
                                                <div className="pt-2 border-t">
                                                    <p className="text-xs text-muted-foreground mb-2">CC Emails</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {contact.cc_emails.map((ccEmail, emailIndex) => (
                                                            <Badge
                                                                key={emailIndex}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {ccEmail}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Alert>
                            <AlertDescription>No client contacts found.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                        <div>
                            <span className="font-medium">Created:</span>{' '}
                            {formatDateTime(data.createdAt)}
                        </div>
                        <div>
                            <span className="font-medium">Last Updated:</span>{' '}
                            {formatDateTime(data.updatedAt)}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default SubmitQueryView;
