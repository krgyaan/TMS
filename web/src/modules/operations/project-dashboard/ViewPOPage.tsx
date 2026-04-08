// src/pages/project-dashboard/ViewPO.tsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Building2,
  Truck,
  FileText,
  Calendar,
  Hash,
  Mail,
  MapPin,
  Loader2,
  Receipt,
  Printer,
  Download,
  Edit,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Send,
  Trash2,
  FileCheck,
  CreditCard,
  XCircle,
  User,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

/* UI Components */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Hooks - Update these imports based on your actual API hooks
// import { usePurchaseOrderDetails } from "./project-dashboard.hooks";
import { paths } from "@/app/routes/paths";
import { usePurchaseOrderDetails } from "./project-dashboard.hooks";
/* ================================
   TYPES
================================ */
interface Product {
  id: number;
  description: string;
  hsnSac: string;
  qty: number;
  rate: number;
  gstRate: number;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  poDate: string;
  status:
    | "draft"
    | "pending"
    | "approved"
    | "sent"
    | "acknowledged"
    | "completed"
    | "cancelled";
  projectName: string;
  tenderNumber: string;

  // Seller Information
  sellerId?: number;
  sellerName: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerGstNo: string;
  sellerPanNo: string;
  sellerMsmeNo: string;

  // Ship To Information
  shipToName: string;
  shippingAddress: string;
  shipToGst: string;
  shipToPan: string;

  // Products
  products: Product[];

  // Additional Details
  quotationNo?: string;
  quotationDate?: string;
  paymentTerms?: string;
  deliveryPeriod?: string;
  remarks?: string;

  // Totals
  subtotal: number;
  totalGst: number;
  grandTotal: number;

  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ================================
   LOADING SKELETON
================================ */
const ViewSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-20 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>

    <div className="grid grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

/* ================================
   INFO ITEM COMPONENT
================================ */
interface InfoItemProps {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  copyable?: boolean;
  mono?: boolean;
  className?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  icon: Icon,
  copyable = false,
  mono = false,
  className = "",
}) => {
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    }
  };

  if (!value) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <div className="flex items-center gap-2 group">
        <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {copyable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

/* ================================
   DETAIL BLOCK COMPONENT
================================ */
interface DetailBlockProps {
  title: string;
  subtitle?: string;
  address?: string;
  icon: React.ComponentType<{ className?: string }>;
  email?: string;
  items: Array<{
    label: string;
    value?: string;
    copyable?: boolean;
    mono?: boolean;
  }>;
}

const DetailBlock: React.FC<DetailBlockProps> = ({
  title,
  subtitle,
  address,
  icon: Icon,
  email,
  items,
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {subtitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/40 border space-y-3">
          <h3 className="font-semibold text-lg leading-tight">{title}</h3>
          {address && (
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{address}</span>
            </p>
          )}
          {email && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <a
                href={`mailto:${email}`}
                className="hover:underline hover:text-foreground transition-colors"
              >
                {email}
              </a>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(
            (item, index) =>
              item.value && (
                <InfoItem
                  key={index}
                  label={item.label}
                  value={item.value}
                  copyable={item.copyable}
                  mono={item.mono}
                />
              )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ================================
   MAIN COMPONENT
================================ */
export default function ViewPOPage() {
  const navigate = useNavigate();
  const { id } = useParams();
//   const projectId = Number(id);
  const purchaseOrderId = Number(id);

  const { data: poData, isLoading, error, refetch } = usePurchaseOrderDetails(purchaseOrderId);

  console.log("poData", poData);

  /* Action Handlers */
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info("Generating PDF...");
    // Implement PDF generation logic
  };

  const handleEdit = (id: number) => {
    navigate(paths.operations.editPoPage(id));
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <ViewSkeleton />
      </div>
    );
  }


  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6 max-w-7xl print:py-4 print:max-w-none print:space-y-4">
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <Separator orientation="vertical" className="h-8" />

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  {poData.poNumber}
                </h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge

                      className="flex items-center gap-1.5 cursor-help"
                    >
                      {poData.status}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent></TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {poData.projectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>


            <Button onClick={() => handleEdit(purchaseOrderId)} className="gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit PO</span>
            </Button>
          </div>
        </div>

        {/* ==================== PRINT HEADER ==================== */}
        <div className="hidden print:flex justify-between items-start border-b-2 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              PURCHASE ORDER
            </h1>
            <p className="text-xl font-semibold mt-2 font-mono">
              {poData.poNumber}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {poData.projectName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm">
              <span className="text-muted-foreground">Date: </span>
              <span className="font-semibold">{formatDate(poData.poDate)}</span>
            </div>
            <Badge className="mt-2">

            </Badge>
          </div>
        </div>

        {/* ==================== SUMMARY CARDS ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
          <Card className="print:shadow-none print:border">
            <CardContent className="pt-6 print:pt-4 print:pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 print:p-2">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    Total Value
                  </p>
                  <p className="text-lg font-bold truncate print:text-base">
                    {formatCurrency(poData.total.totalWithGst)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:shadow-none print:border">
            <CardContent className="pt-6 print:pt-4 print:pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 print:p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    PO Date
                  </p>
                  <p className="text-lg font-bold print:text-base">
                    {formatDate(poData.poDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ==================== SELLER & SHIP TO ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
          <DetailBlock
            title={poData.sellerName}
            subtitle="Seller / Vendor"
            address={poData.sellerAddress}
            email={poData.sellerEmail}
            icon={Building2}
            items={[
              {
                label: "GST No.",
                value: poData.sellerGstNo,
                copyable: true,
                mono: true,
              },
              {
                label: "PAN No.",
                value: poData.sellerPanNo,
                copyable: true,
                mono: true,
              },
              {
                label: "MSME No.",
                value: poData.sellerMsmeNo,
                copyable: true,
                mono: true,
              },
            ]}
          />

          <DetailBlock
            title={poData.shipToName}
            subtitle="Ship To / Delivery"
            address={poData.shippingAddress}
            icon={Truck}
            items={[
              {
                label: "GST No.",
                value: poData.shipToGst,
                copyable: true,
                mono: true,
              },
              {
                label: "PAN No.",
                value: poData.shipToPan,
                copyable: true,
                mono: true,
              },
            ]}
          />
        </div>

        {/* ==================== PRODUCTS TABLE ==================== */}
        <Card className="print:shadow-none print:border">
          <CardHeader className="print:pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Products / Services
                </CardTitle>
                <CardDescription className="print:hidden">
                  {poData.products.length} item
                  {poData.products.length !== 1 ? "s" : ""} in this order
                </CardDescription>
              </div>
              <Badge variant="secondary" className="print:hidden">
                {poData.products.length} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[4%] text-center font-semibold">
                      #
                    </TableHead>
                    <TableHead className="w-[32%] font-semibold">
                      Description
                    </TableHead>
                    <TableHead className="w-[10%] font-semibold">
                      HSN/SAC
                    </TableHead>
                    <TableHead className="w-[8%] text-right font-semibold">
                      Qty
                    </TableHead>
                    <TableHead className="w-[12%] text-right font-semibold">
                      Rate
                    </TableHead>
                    <TableHead className="w-[8%] text-center font-semibold">
                      GST
                    </TableHead>
                    <TableHead className="w-[13%] text-right font-semibold">
                      Total (w/o GST)
                    </TableHead>
                    <TableHead className="w-[13%] text-right font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poData.products.map((product, index) => {

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {product.description}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {product.hsnSac}
                          </code>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {product.qty.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(Number(product.rate))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {product.gstRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(Number(product.itemTotal))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(Number(product.itemTotalWithGst))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-t-2">
                    <TableCell
                      colSpan={7}
                      className="text-right font-medium text-muted-foreground"
                    >
                      Subtotal (before tax)
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(poData.total.total)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-right font-medium text-muted-foreground"
                    >
                      Total GST
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(poData.total.totalGst)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 text-lg">
                    <TableCell colSpan={7} className="text-right font-bold">
                      Grand Total
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(poData.total.totalWithGst)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ==================== ADDITIONAL DETAILS ==================== */}
        {(poData.quotationNo ||
          poData.paymentTerms ||
          poData.deliveryPeriod ||
          poData.remarks) && (
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:gap-4">
                {poData.quotationNo && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quotation Reference
                    </span>
                    <p className="font-medium font-mono">{poData.quotationNo}</p>
                    {poData.quotationDate && (
                      <p className="text-sm text-muted-foreground">
                        Dated: {formatDate(poData.quotationDate)}
                      </p>
                    )}
                  </div>
                )}

                {poData.deliveryPeriod && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="h-3 w-3" />
                      Delivery Period
                    </span>
                    <p className="font-medium">{poData.deliveryPeriod}</p>
                  </div>
                )}

                {poData.paymentTerms && (
                  <div className="space-y-1 md:col-span-2 lg:col-span-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="h-3 w-3" />
                      Payment Terms
                    </span>
                    <p className="font-medium text-sm">{poData.paymentTerms}</p>
                  </div>
                )}
              </div>

              {poData.remarks && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Remarks / Special Instructions
                    </span>
                    <div className="p-4 rounded-lg bg-muted/40 border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {poData.remarks}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ==================== ORDER METADATA ==================== */}
        <Card className="print:shadow-none print:border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PO Number
                </span>
                <div className="flex items-center gap-2 group">
                  <p className="font-mono font-semibold">{poData.poNumber}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                        onClick={() => {
                          navigator.clipboard.writeText(poData.poNumber);
                          toast.success("PO number copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tender Number
                </span>
                <p className="font-mono font-semibold">{poData.tenderNumber}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Created By
                </span>
                <p className="font-medium">{poData.createdBy}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(poData.createdAt)}
                </p>
              </div>

              {poData.updatedAt && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Updated
                  </span>
                  <p className="text-sm font-medium">
                    {formatDateTime(poData.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ==================== FOOTER ACTIONS ==================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t print:hidden">
          <div className="text-sm text-muted-foreground">
            Last updated:{" "}
            {formatDateTime(poData.updatedAt || poData.createdAt)}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={() => handleEdit(purchaseOrderId)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit PO
            </Button>
          </div>
        </div>

        {/* ==================== PRINT FOOTER ==================== */}
        <div className="hidden print:block border-t pt-4 mt-8">
          <div className="flex justify-between text-xs text-muted-foreground">
            <div>
              <p>Generated on: {formatDateTime(new Date().toISOString())}</p>
              <p>Created by: {poData.createdBy}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{poData.poNumber}</p>
              <p>Page 1 of 1</p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}