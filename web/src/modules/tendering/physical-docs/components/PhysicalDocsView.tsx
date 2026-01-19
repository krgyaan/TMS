import React from 'react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Pencil, ArrowLeft, Package } from 'lucide-react';
import type { PhysicalDocs } from '../helpers/physicalDocs.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface PhysicalDocsViewProps {
    physicalDoc: PhysicalDocs | null;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

export function PhysicalDocsView({
    physicalDoc,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: PhysicalDocsViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!physicalDoc) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Physical Documents
                    </CardTitle>
                    <CardAction className="flex gap-2">
                        {showEditButton && onEdit && (
                            <Button variant="default" size="sm" onClick={onEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Create Physical Docs
                            </Button>
                        )}
                        {showBackButton && onBack && (
                            <Button variant="outline" size="sm" onClick={onBack}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        )}
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No physical documents information available yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Physical Documents Details
                </CardTitle>
                <CardAction className="flex gap-2">
                    {showEditButton && onEdit && (
                        <Button variant="default" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    {showBackButton && onBack && (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </CardAction>
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
                                {physicalDoc.submittedDocs ? (
                                    <div className="bg-muted/30 p-3 rounded-md">
                                        {physicalDoc.submittedDocs}
                                    </div>
                                ) : (
                                    '—'
                                )}
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
