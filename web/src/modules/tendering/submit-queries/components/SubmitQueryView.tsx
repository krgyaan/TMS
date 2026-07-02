import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileQuestion } from 'lucide-react';
import type { SubmitQueryResponse } from '../helpers/submitQueries.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface SubmitQueryViewProps {
    data?: SubmitQueryResponse;
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
                        Loading Submit Query...
                    </div>
                </CardContent>
            </Card>
        );
    }

return (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileQuestion className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Submitted Details</CardTitle>
          <Badge variant="secondary">
            {data?.queries?.length || 0}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead>Page No.</TableHead>
                <TableHead>Clause No.</TableHead>
                <TableHead>Query Type</TableHead>
                <TableHead>Current Statement</TableHead>
                <TableHead>Requested Statement</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* ================= QUERIES ================= */}
              {data?.queries && data?.queries?.length > 0 ? (
                data.queries.map((query, index) => (
                  <TableRow key={`query-${index}`}>
                    <TableCell className="text-center font-medium text-xs">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm">{query.pageNo}</TableCell>
                    <TableCell className="text-sm">{query.clauseNo}</TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        variant={
                          queryTypeBadgeVariant[query.queryType] ||
                          "default"
                        }
                      >
                        {queryTypeLabels[query.queryType] ||
                          query.queryType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] text-sm whitespace-pre-wrap">
                      {query.currentStatement}
                    </TableCell>
                    <TableCell className="max-w-[250px] text-sm whitespace-pre-wrap">
                      {query.requestedStatement}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    No queries found.
                  </TableCell>
                </TableRow>
              )}

              {/* ================= CLIENT CONTACTS ================= */}
              {data?.clientContacts && data.clientContacts.length > 0 && (
                <>
                  <TableRow className="bg-muted/50">
                    <TableCell
                      colSpan={6}
                      className="font-semibold text-sm"
                    >
                      Client Contacts
                    </TableCell>
                  </TableRow>

                  {data.clientContacts.map((client, index) => (
                    <TableRow key={`client-${index}`}>
                      <TableCell>
                        <span className="text-muted-foreground text-xs block">
                          Name
                        </span>
                        {client.client_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs block">
                          Email
                        </span>
                        {client.client_email}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs block">
                          Phone
                        </span>
                        {client.client_phone}
                      </TableCell>
                      <TableCell colSpan={2}>
                        <span className="text-muted-foreground text-xs block">
                          Organization
                        </span>
                        {client.client_org}
                      </TableCell>
                      <TableCell colSpan={2}>
                        <span className="text-muted-foreground text-xs block">
                          CC Email
                        </span>
                        {client.cc_emails && client.cc_emails.length > 0 ? (
                          client.cc_emails.map((email, index) => (
                            <span key={index} className="block">
                              {email}
                            </span>
                          ))
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* ================= TIMELINE ================= */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={6} className="font-semibold text-sm">
                  Timeline
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <span className="text-muted-foreground text-xs block">
                    Requested On
                  </span>
                  {formatDateTime(data?.createdAt)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);
}

export function SubmitQuerySection({ data, isLoading, error }: { data: any; isLoading: boolean; error: Error }) {
  return <SubmitQueryView data={data} isLoading={isLoading} error={error} />;
}
;
