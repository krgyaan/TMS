import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, ArrowLeft, Package, User, Mail, Phone } from 'lucide-react';
import type { PhysicalDocs } from '@/types/api.types';

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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <tbody className="divide-y divide-border">
                            {/* Basic Information */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Document Information
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Physical Doc ID
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <Badge variant="outline">{physicalDoc.id}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Tender ID
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <Badge variant="outline">{physicalDoc.tenderId}</Badge>
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Courier Number
                                </td>
                                <td className="px-4 py-3 text-sm" colSpan={3}>
                                    <Badge variant="secondary">{physicalDoc.courierNo}</Badge>
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Submitted Documents
                                </td>
                                <td className="px-4 py-3 text-sm" colSpan={3}>
                                    {physicalDoc.submittedDocs ? (
                                        <div className="bg-muted/30 p-3 rounded-md">
                                            {physicalDoc.submittedDocs}
                                        </div>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                            </tr>

                            {/* Contact Persons */}
                            {physicalDoc.persons && physicalDoc.persons.length > 0 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Contact Persons
                                        </td>
                                    </tr>
                                    {physicalDoc.persons.map((person, index) => (
                                        <tr key={person.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm" colSpan={4}>
                                                <div className="bg-card border rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-semibold">Person {index + 1}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1">Name</div>
                                                            <div className="text-sm font-medium">{person.name}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                Email
                                                            </div>
                                                            <div className="text-sm">{person.email}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                Phone
                                                            </div>
                                                            <div className="text-sm">{person.phone}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

export default PhysicalDocsView;
