import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Mail,
  FileText,
  CreditCard,
  Users,
} from 'lucide-react';
import {
  useVendorOrganizationsWithRelations,
  useDeleteVendorOrganization,
} from '@/hooks/api/useVendorOrganizations';
import type {
  VendorOrganizationWithRelations,
  Vendor,
  VendorGst,
  VendorAcc,
} from '@/types/api.types';

const VendorOrganizationsPage = () => {
  const {
    data: organizations,
    isLoading,
    error,
    refetch,
  } = useVendorOrganizationsWithRelations();
  const deleteOrganization = useDeleteVendorOrganization();

  // Modal states
  const [gstModal, setGstModal] = useState<{
    open: boolean;
    data: VendorGst[];
    orgName: string;
  }>({ open: false, data: [], orgName: '' });

  const [accountsModal, setAccountsModal] = useState<{
    open: boolean;
    data: VendorAcc[];
    orgName: string;
  }>({ open: false, data: [], orgName: '' });

  const [vendorsModal, setVendorsModal] = useState<{
    open: boolean;
    data: Vendor[];
    orgName: string;
  }>({ open: false, data: [], orgName: '' });

  // Handlers
  const handleViewGsts = (org: VendorOrganizationWithRelations) => {
    setGstModal({ open: true, data: org.gsts || [], orgName: org.name });
  };

  const handleViewAccounts = (org: VendorOrganizationWithRelations) => {
    setAccountsModal({
      open: true,
      data: org.accounts || [],
      orgName: org.name,
    });
  };

  const handleViewVendors = (org: VendorOrganizationWithRelations) => {
    setVendorsModal({
      open: true,
      data: org.persons || [],
      orgName: org.name,
    });
  };

  const handleDelete = async (org: VendorOrganizationWithRelations) => {
    if (
      confirm(
        `Are you sure you want to delete "${org.name}"? This will also remove all associated vendors, GSTs, and accounts.`,
      )
    ) {
      try {
        await deleteOrganization.mutateAsync(org.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Organizations</CardTitle>
          <CardDescription>
            Manage vendor organizations and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading vendor organizations: {error.message}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vendor Organizations</CardTitle>
          <CardDescription>
            Manage vendor organizations, GST numbers, bank accounts, and vendors
          </CardDescription>
          <CardAction>
            <Button variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Organisation Name</TableHead>
                  <TableHead className="text-center">GST Numbers</TableHead>
                  <TableHead className="text-center">Accounts</TableHead>
                  <TableHead className="text-center">All Vendors</TableHead>
                  <TableHead className="text-center w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org, index) => (
                    <TableRow key={org.id}>
                      {/* S.No. */}
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>

                      {/* Organisation Name */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{org.name}</span>
                            <Badge
                              variant={org.status ? 'default' : 'secondary'}
                              className="ml-2"
                            >
                              {org.status ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {org.address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {org.address}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* GST Numbers */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewGsts(org)}
                          className="w-full max-w-[140px]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <div className="flex flex-col items-start">
                            <span>See GSTs</span>
                            <span className="text-xs text-muted-foreground">
                              Total: {org._counts?.gsts || 0}
                            </span>
                          </div>
                        </Button>
                      </TableCell>

                      {/* Accounts */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAccounts(org)}
                          className="w-full max-w-[140px]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <div className="flex flex-col items-start">
                            <span>See Accounts</span>
                            <span className="text-xs text-muted-foreground">
                              Total: {org._counts?.accounts || 0}
                            </span>
                          </div>
                        </Button>
                      </TableCell>

                      {/* All Vendors */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVendors(org)}
                          className="w-full max-w-[140px]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <div className="flex flex-col items-start">
                            <span>See Vendors</span>
                            <span className="text-xs text-muted-foreground">
                              Total: {org._counts?.persons || 0}
                            </span>
                          </div>
                        </Button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => console.log('Edit', org)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDelete(org)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No vendor organizations found
                        </p>
                        <Button variant="outline" className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first organization
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* GST Numbers Modal */}
      <Dialog open={gstModal.open} onOpenChange={(open) => setGstModal({ ...gstModal, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              GST Numbers - {gstModal.orgName}
            </DialogTitle>
            <DialogDescription>
              Total GST Numbers: {gstModal.data.length}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {gstModal.data.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No.</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>GST Number</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstModal.data.map((gst, index) => (
                      <TableRow key={gst.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{gst.gstState}</TableCell>
                        <TableCell className="font-mono">{gst.gstNum}</TableCell>
                        <TableCell>
                          <Badge variant={gst.status ? 'default' : 'secondary'}>
                            {gst.status ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No GST numbers found for this organization</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Accounts Modal */}
      <Dialog
        open={accountsModal.open}
        onOpenChange={(open) => setAccountsModal({ ...accountsModal, open })}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Accounts - {accountsModal.orgName}
            </DialogTitle>
            <DialogDescription>
              Total Bank Accounts: {accountsModal.data.length}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {accountsModal.data.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No.</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>IFSC Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsModal.data.map((account, index) => (
                      <TableRow key={account.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell className="font-mono">
                          {account.accountNum}
                        </TableCell>
                        <TableCell className="font-mono">
                          {account.accountIfsc}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.status ? 'default' : 'secondary'}>
                            {account.status ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No bank accounts found for this organization</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendors Modal */}
      <Dialog
        open={vendorsModal.open}
        onOpenChange={(open) => setVendorsModal({ ...vendorsModal, open })}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vendors - {vendorsModal.orgName}
            </DialogTitle>
            <DialogDescription>
              Total Vendors: {vendorsModal.data.length}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {vendorsModal.data.length > 0 ? (
              <div className="space-y-3">
                {vendorsModal.data.map((vendor, index) => (
                  <div
                    key={vendor.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-semibold">{vendor.name}</span>
                        <Badge variant={vendor.status ? 'default' : 'secondary'}>
                          {vendor.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {vendor.address}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No vendors found for this organization</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VendorOrganizationsPage;
