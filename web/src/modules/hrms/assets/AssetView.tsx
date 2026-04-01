import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHrmsAssetView } from '@/hooks/api/useHrmsAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Package,
  User,
  MapPin,
  FileText,
  Shield,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { paths } from '@/app/routes/paths';
import { ACCESSORIES_LIST } from "./constants";


const AssetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useHrmsAssetView(Number(id));

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const statusMap: Record<string, { variant: any; className: string }> = {
      "Assigned":     { variant: 'default',     className: 'bg-green-800 text-green-100 hover:bg-green-800' },
      "Available":    { variant: 'secondary',   className: 'bg-blue-800 text-blue-100 hover:bg-blue-800' },
      "Under Repair": { variant: 'secondary',   className: 'bg-yellow-800 text-yellow-100 hover:bg-yellow-800' },
      "Damaged":      { variant: 'destructive', className: 'bg-red-800 text-red-100 hover:bg-red-800' },
      "Lost":         { variant: 'destructive', className: 'bg-red-800 text-red-100 hover:bg-red-800' },
      "Returned":     { variant: 'secondary',   className: 'bg-gray-800 text-gray-100 hover:bg-gray-800' },
    };

    const config = statusMap[status ?? "Available"] ?? statusMap["Available"];
    return (
      <Badge variant={config.variant} className={`${config.className} border-none`}>
        {status ?? "Available"}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string | null | undefined) => {
    const conditionMap: Record<string, string> = {
      "New":  'bg-green-800 text-green-100',
      "Good": 'bg-blue-800 text-blue-100',
      "Fair": 'bg-yellow-800 text-yellow-100',
      "Poor": 'bg-red-800 text-red-100',
    };

    const className = conditionMap[condition ?? "Good"] ?? conditionMap["Good"];
    return (
      <Badge variant="secondary" className={`${className} border-none`}>
        {condition ?? "Good"}
      </Badge>
    );
  };

  // Mirrors courier module: store filename only, prefix URL client-side.
  // Also handles legacy records that stored the full relative path.
  const getAssetFileUrl = (storedValue: string | null | undefined): string => {
    if (!storedValue) return "";
    if (storedValue.startsWith("uploads/")) return `/${storedValue}`;
    return `/uploads/hrms/assets/${storedValue}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Asset not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/hrms/admin/assets')}>
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hrms/admin/assets')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <span className="font-mono text-primary">{asset.assetCode}</span>
              {getStatusBadge(asset.assetStatus)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {asset.assetType} • {asset.brand} {asset.model}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(paths.hrms.assetEdit(Number(id)))} size="lg">
          <Edit className="h-4 w-4 mr-2" />
          Edit Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <InfoField label="Asset Code" value={asset.assetCode} mono />
                <InfoField label="Asset Type" value={asset.assetType} />
                <InfoField label="Category" value={asset.assetCategory} />
                <InfoField label="Brand" value={asset.brand} />
                <InfoField label="Model" value={asset.model} />
                <InfoField label="Serial Number" value={asset.serialNumber} mono />
                <InfoField label="IMEI Number" value={asset.imeiNumber} mono />
                <InfoField label="License Key" value={asset.licenseKey} mono />
                <InfoField
                  label="Asset Value"
                  value={asset.assetValue ? `$${asset.assetValue}` : undefined}
                />
                <InfoField
                  label="Condition"
                  value={<span>{getConditionBadge(asset.assetCondition)}</span>}
                />
              </div>

              {asset.specifications && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Specifications</p>
                    <p className="text-sm">{asset.specifications}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <InfoField label="Assigned To" value={`EMP-${asset.userId}`} />
                <InfoField label="Assigned By" value={asset.assignedBy ? `EMP-${asset.assignedBy}` : undefined} />
                <InfoField label="Assigned Date" value={formatDate(asset.assignedDate)} icon={<Calendar className="h-4 w-4" />} />
                <InfoField label="Expected Return" value={formatDate(asset.expectedReturnDate)} icon={<Calendar className="h-4 w-4" />} />
                <InfoField label="Location" value={asset.assetLocation} icon={<MapPin className="h-4 w-4" />} />
                <InfoField label="Status" value={<span>{getStatusBadge(asset.assetStatus)}</span>} />
              </div>

              {asset.purpose && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Purpose</p>
                    <p className="text-sm">{asset.purpose}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Warranty & Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Warranty & Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <InfoField label="Warranty From" value={formatDate(asset.warrantyFrom)} />
                <InfoField label="Warranty To" value={formatDate(asset.warrantyTo)} />
                <InfoField label="Insurance Details" value={asset.insuranceDetails} className="col-span-2" />
              </div>

              {asset.warrantyFrom && asset.warrantyTo && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Warranty is {new Date(asset.warrantyTo) > new Date() ? 'active' : 'expired'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessories */}
          {asset.accessories && asset.accessories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Accessories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {asset.accessories.map((accessoryId: string, idx: number) => {
                    const found = ACCESSORIES_LIST.find(a => a.id === accessoryId);
                    return (
                      <Badge key={idx} variant="secondary">
                        {found?.label ?? accessoryId}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Information (if returned) */}
          {asset.assetStatus === 'Returned' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Return Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="Return Date" value={formatDate(asset.returnDate)} />
                  <InfoField label="Return Condition" value={<span>{getConditionBadge(asset.returnCondition)}</span>} />
                  {asset.deductionAmount && (
                    <InfoField label="Deduction Amount" value={`$${asset.deductionAmount}`} />
                  )}
                  {asset.damageRemarks && (
                    <InfoField label="Damage Remarks" value={asset.damageRemarks} className="col-span-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Asset Photos */}
          {asset.assetPhotos && asset.assetPhotos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  Asset Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {asset.assetPhotos.map((photo: string, idx: number) => (
                    <a
                      key={idx}
                      href={getAssetFileUrl(photo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={getAssetFileUrl(photo)}
                        alt={`Asset ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {asset.purchaseInvoiceUrl && (
                <DocumentLink
                  label="Purchase Invoice"
                  url={asset.purchaseInvoiceUrl}
                />
              )}
              {asset.warrantyCardUrl && (
                <DocumentLink
                  label="Warranty Card"
                  url={asset.warrantyCardUrl}
                />
              )}
              {asset.assignmentFormUrl && (
                <DocumentLink
                  label="Assignment Form"
                  url={asset.assignmentFormUrl}
                />
              )}
              {!asset.purchaseInvoiceUrl && !asset.warrantyCardUrl && !asset.assignmentFormUrl && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents attached
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(asset.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{formatDate(asset.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface InfoFieldProps {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, mono, className }) => {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${!value ? 'text-muted-foreground' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  );
};

interface DocumentLinkProps {
  label: string;
  url: string;
}

const DocumentLink: React.FC<DocumentLinkProps> = ({ label, url }) => {
  const getAssetFileUrl = (storedValue: string) => {
    if (!storedValue) return "";
    if (storedValue.startsWith("uploads/")) return `/${storedValue}`;
    return `/uploads/hrms/assets/${storedValue}`;
  };

  return (
    <a
      href={getAssetFileUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  );
};

export default AssetView;