import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Package } from 'lucide-react';
import type { PhysicalDocs } from '../helpers/physicalDocs.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';

interface PhysicalDocsViewProps {
    physicalDoc?: PhysicalDocs | null;
}

export function PhysicalDocsView({ physicalDoc }: PhysicalDocsViewProps) {
    if (!physicalDoc) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"> 
                    <Package className="h-5 w-5 text-blue-500" />
                    Physical Documents Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Document Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Courier Number
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="secondary">{physicalDoc.courierNo}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Submitted Documents
                            </TableCell>
                            <TableCell className="text-sm">
                                {physicalDoc.submittedDocs?.map((doc) => doc.name).join(", ")}
                            </TableCell>
                        </TableRow>
                        {physicalDoc.createdAt && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Created At
                                </TableCell>
                                <TableCell className="text-sm">
                                    {formatDateTime(physicalDoc.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Last Updated
                                </TableCell>
                                <TableCell className="text-sm">
                                    {physicalDoc.updatedAt ? formatDateTime(physicalDoc.updatedAt) : '—'}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Contact Persons */}
                        {physicalDoc.persons && physicalDoc.persons.length > 0 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Contact Persons
                                    </TableCell>
                                </TableRow>
                                {physicalDoc.persons.map((person, index) => (
                                    <React.Fragment key={person.id}>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Person {index + 1} Name
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {person.name}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Email
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {person.email || '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Phone
                                            </TableCell>
                                            <TableCell className="text-sm" colSpan={3}>
                                                {person.phone || '—'}
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default PhysicalDocsView;

/** Self-fetching section for PhysicalDocs */
export function PhysicalDocsSection({ tenderId }: { tenderId: number | null }) {
    const { data: physicalDoc, isLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: infoSheet } = useInfoSheet(tenderId);

        if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!infoSheet) {
        return (
            <Card>
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Tender Info Sheet Not Filled</p>
                </div>
            </Card>
        );
    }

    else if (infoSheet && infoSheet.physicalDocsRequired == 'NO' || infoSheet.physicalDocsRequired == null) {
        return (
            <Card>
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Physical Docs Not Required</p>
                </div>
            </Card>
        );
    }

    else if (infoSheet && infoSheet.physicalDocsRequired == 'YES' && !physicalDoc) {
        return (
            <Card>
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No Physical Docs Submitted</p>
                </div>
            </Card>
        );
    }

    if (!physicalDoc) {
        return (
            <Card>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Package className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No physical documents information available yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return <PhysicalDocsView physicalDoc={physicalDoc}/>;
}
