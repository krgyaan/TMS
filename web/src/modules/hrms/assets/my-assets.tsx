import React, { useState } from 'react';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { useHrmsAssetsByUser } from '@/hooks/api/useHrmsAssets';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Laptop, Smartphone, Box, PackageOpen, Monitor, Tag, Calendar, FileText, Settings, Key, Hash, Info, UserRound } from 'lucide-react';
import type { EmployeeAsset } from '@/services/api/hrms-assets.service';

const MyAssets: React.FC = () => {
  const { data: user } = useCurrentUser();
  const { data: assets, isLoading } = useHrmsAssetsByUser(user?.id);
  
  const [selectedAsset, setSelectedAsset] = useState<EmployeeAsset | null>(null);

  const getAssetIcon = (type: string | undefined, mainClass = "h-10 w-10") => {
    const t = type?.toLowerCase() || '';
    if (t.includes('laptop') || t.includes('computer')) return <Laptop className={`${mainClass} text-primary`} />;
    if (t.includes('mobile') || t.includes('phone')) return <Smartphone className={`${mainClass} text-primary`} />;
    if (t.includes('monitor') || t.includes('display')) return <Monitor className={`${mainClass} text-primary`} />;
    return <Box className={`${mainClass} text-primary`} />;
  };

  const formatDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 max-w-7xl">
        <div className="mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                    <CardHeader className="h-32 bg-muted/30 pb-0" />
                    <CardContent className="pt-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Assets</h1>
        <p className="text-muted-foreground">View and track all company hardware and software licenses officially assigned to your profile.</p>
      </div>
      
      {!assets || assets.length === 0 ? (
        <Card className="border-dashed shadow-none bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center h-64">
                <PackageOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No assets assigned</p>
                <p className="text-sm text-muted-foreground mt-1">You currently have no hardware or software assets assigned to you.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group hover:-translate-y-1 transition-transform duration-300 hover:shadow-md border-muted">
              <div className="h-36 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center border-b relative overflow-hidden group-hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] transition-all">
                {asset.assetPhotos && asset.assetPhotos.length > 0 ? (
                  <img 
                    src={`http://localhost:3000/${asset.assetPhotos[0].replace(/\\/g, '/').replace(/^\.\//, '')}`} 
                    alt={`${asset.brand || 'Asset'} ${asset.model || ''}`} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <span className="transition-transform duration-300 group-hover:scale-110 relative z-10">
                    {getAssetIcon(asset.assetType)}
                  </span>
                )}
                {/* Overlay for text visibility */}
                {asset.assetPhotos && asset.assetPhotos.length > 0 && (
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500 z-0" />
                )}
                <div className="absolute top-3 right-3 z-10">
                  {(!asset.assetStatus || asset.assetStatus.toLowerCase() === 'assigned') ? (
                       <Badge variant="default" className="bg-green-100/95 text-green-800 hover:bg-green-100 border-none shadow-sm backdrop-blur-sm">Assigned</Badge>
                  ) : (
                       <Badge variant="secondary" className="backdrop-blur-sm bg-secondary/95 shadow-sm">{asset.assetStatus}</Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg text-foreground leading-tight mb-1">
                  {asset.brand || 'Asset'} {asset.model}
                </h3>
                <div className="text-xs text-muted-foreground flex flex-col gap-1.5 mt-3">
                  <span className="flex items-center gap-2"><Tag className="h-3 w-3" /> {asset.assetType} • {asset.assetCode}</span>
                  <span className="flex items-center gap-2"><Hash className="h-3 w-3" /> SN: {asset.serialNumber || 'N/A'}</span>
                  <span className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Assigned: {formatDate(asset.assignedDate)}</span>
                </div>
              </CardContent>
              <CardFooter className="px-5 pb-5 pt-0">
                <Button 
                    variant="outline" 
                    className="w-full text-primary hover:text-primary/90 bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => setSelectedAsset(asset)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Detail View Modal */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-2xl">
            {selectedAsset && (
                <>
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-2">
                            {selectedAsset.assetPhotos && selectedAsset.assetPhotos.length > 0 ? (
                                <img 
                                    src={`http://localhost:3000/${selectedAsset.assetPhotos[0].replace(/\\/g, '/').replace(/^\.\//, '')}`} 
                                    className="h-16 w-16 rounded-xl object-cover shrink-0 border border-muted-foreground/20 shadow-sm"
                                    alt={`${selectedAsset.brand} ${selectedAsset.model}`}
                                />
                            ) : (
                                <div className="p-3.5 bg-muted rounded-xl shrink-0 border border-muted-foreground/10">
                                    {getAssetIcon(selectedAsset.assetType, "h-8 w-8")}
                                </div>
                            )}
                            <div>
                                <DialogTitle className="text-xl">
                                    {selectedAsset.brand} {selectedAsset.model}
                                </DialogTitle>
                                <DialogDescription className="text-sm mt-0.5">
                                    Asset Code: <span className="font-mono text-primary font-medium">{selectedAsset.assetCode}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-4 mt-2">
                        {/* Hardware Details */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary border-b pb-2">
                                <Settings className="h-4 w-4" /> Hardware Specifications
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-muted-foreground block mb-1">Asset Type</span> <span className="font-medium">{selectedAsset.assetType}</span></div>
                                <div><span className="text-muted-foreground block mb-1">Brand</span> <span className="font-medium">{selectedAsset.brand || '—'}</span></div>
                                <div><span className="text-muted-foreground block mb-1">Model</span> <span className="font-medium">{selectedAsset.model || '—'}</span></div>
                                <div><span className="text-muted-foreground block mb-1">Serial Number</span> <span className="font-medium font-mono text-xs">{selectedAsset.serialNumber || '—'}</span></div>
                                {selectedAsset.imeiNumber && (
                                    <div className="col-span-2"><span className="text-muted-foreground block mb-1">IMEI</span> <span className="font-medium font-mono text-xs">{selectedAsset.imeiNumber}</span></div>
                                )}
                            </div>
                        </div>

                        {/* Assignment Details */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary border-b pb-2">
                                <UserRound className="h-4 w-4" /> Assignment Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-muted-foreground block mb-1">Status</span> 
                                    {(!selectedAsset.assetStatus || selectedAsset.assetStatus.toLowerCase() === 'assigned') ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shadow-none">Assigned</Badge>
                                    ) : (
                                        <Badge variant="secondary">{selectedAsset.assetStatus}</Badge>
                                    )}
                                </div>
                                <div><span className="text-muted-foreground block mb-1">Condition</span> <span className="font-medium capitalize">{selectedAsset.assetCondition || 'Good'}</span></div>
                                <div><span className="text-muted-foreground block mb-1">Assigned Date</span> <span className="font-medium">{formatDate(selectedAsset.assignedDate)}</span></div>
                                <div><span className="text-muted-foreground block mb-1">Expected Return</span> <span className="font-medium">{formatDate(selectedAsset.expectedReturnDate)}</span></div>
                            </div>
                        </div>

                        {/* Additional Info / Software */}
                        {(selectedAsset.licenseKey || selectedAsset.warrantyTo) && (
                            <div className="col-span-2 space-y-4 pt-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary border-b pb-2">
                                    <Info className="h-4 w-4" /> Additional Information
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {selectedAsset.licenseKey && (
                                        <div className="col-span-2"><span className="text-muted-foreground block mb-1 flex items-center gap-1"><Key className="h-3 w-3"/> License Key</span> <span className="font-medium font-mono text-xs">{selectedAsset.licenseKey}</span></div>
                                    )}
                                    {selectedAsset.warrantyFrom && (
                                        <div><span className="text-muted-foreground block mb-1">Warranty From</span> <span className="font-medium">{formatDate(selectedAsset.warrantyFrom)}</span></div>
                                    )}
                                    {selectedAsset.warrantyTo && (
                                        <div><span className="text-muted-foreground block mb-1">Warranty Until</span> <span className="font-medium text-amber-600 font-semibold">{formatDate(selectedAsset.warrantyTo)}</span></div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Documents */}
                        {(selectedAsset.assignmentFormUrl || selectedAsset.warrantyCardUrl) && (
                            <div className="col-span-2 space-y-4 pt-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary border-b pb-2">
                                    <FileText className="h-4 w-4" /> Documents
                                </h4>
                                <div className="flex gap-3">
                                    {selectedAsset.assignmentFormUrl && (
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={`http://localhost:3000/${selectedAsset.assignmentFormUrl.replace('./', '')}`} target="_blank" rel="noreferrer">
                                                <FileText className="h-4 w-4 mr-2" />
                                                Assignment Form
                                            </a>
                                        </Button>
                                    )}
                                    {selectedAsset.warrantyCardUrl && (
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={`http://localhost:3000/${selectedAsset.warrantyCardUrl.replace('./', '')}`} target="_blank" rel="noreferrer">
                                                <FileText className="h-4 w-4 mr-2" />
                                                Warranty Document
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssets;
