// src/pages/project-dashboard/EditPurchaseOrder.tsx

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Building2,
  Truck,
  FileText,
  UserPlus,
  Calculator,
  Calendar,
  Hash,
  Mail,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Receipt,
  ChevronDown,
  ChevronUp,
  Copy,
  Save,
} from "lucide-react";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Hooks
import {
  usePoParties,
  usePurchaseOrderDetails,
  useUpdatePurchaseOrder,
  useCreatePoParty,
} from "./project-dashboard.hooks";
import type { UpdatePurchaseOrderDTO, CreatePartyDTO } from "./project-dashboard.api";
import { paths } from "@/app/routes/paths";

/* ================================
   TYPES
================================ */
interface Party {
  id: number;
  name: string;
  email: string;
  address: string;
  gstNo: string;
  pan: string;
  msme: string;
}

interface Product {
  id: string;
  description: string;
  hsnSac: string;
  qty: number;
  rate: number;
  gstRate: number;
}

interface SellerInfo {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerGstNo: string;
  sellerPanNo: string;
  sellerMsmeNo: string;
}

interface ShipToInfo {
  partyId: string;
  shipToName: string;
  shippingAddress: string;
  shipToGst: string;
  shipToPan: string;
}

interface NewPartyForm {
  name: string;
  email: string;
  address: string;
  gstNo: string;
  pan: string;
  msme: string;
}

interface FormErrors {
  seller?: string;
  shipTo?: string;
  products?: string;
  general?: string;
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

const formatDate = (date: string | Date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/* ================================
   LOADING SKELETON
================================ */
const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/* ================================
   NOT FOUND COMPONENT
================================ */
const NotFound = ({ message, onBack }: { message: string; onBack: () => void }) => (
  <div className="container mx-auto py-6 max-w-6xl">
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Not Found</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </CardContent>
    </Card>
  </div>
);

/* ================================
   MAIN COMPONENT
================================ */
export default function EditPOPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const purchaseOrderId = Number(id);

  // API Hooks
  const {
    data: poData,
    isLoading: isPOLoading,
    isError: isPOError,
    error: poError,
  } = usePurchaseOrderDetails(purchaseOrderId);

  console.log("data" , poData);

  const projectId = poData?.projectId;

  const { data: partiesData, isLoading: isPartiesLoading } = usePoParties();
  const updatePOMutation = useUpdatePurchaseOrder();
  const createPartyMutation = useCreatePoParty();

  // Parties list from API
  const parties: Party[] = partiesData || [];

  // Form States
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [poDate, setPoDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Optional fields
  const [quotationNo, setQuotationNo] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryPeriod, setDeliveryPeriod] = useState("");
  const [remarks, setRemarks] = useState("");

  // Seller Information
  const [sellerInfo, setSellerInfo] = useState<SellerInfo>({
    sellerId: "",
    sellerName: "",
    sellerEmail: "",
    sellerAddress: "",
    sellerGstNo: "",
    sellerPanNo: "",
    sellerMsmeNo: "",
  });

  // Ship To Information
  const [shipToInfo, setShipToInfo] = useState<ShipToInfo>({
    partyId: "",
    shipToName: "",
    shippingAddress: "",
    shipToGst: "",
    shipToPan: "",
  });

  // Products
  const [products, setProducts] = useState<Product[]>([
    {
      id: generateUniqueId(),
      description: "",
      hsnSac: "",
      qty: 0,
      rate: 0,
      gstRate: 18,
    },
  ]);

  // New Party Form
  const [newParty, setNewParty] = useState<NewPartyForm>({
    name: "",
    email: "",
    address: "",
    gstNo: "",
    pan: "",
    msme: "",
  });

  // Initialize form with PO data
  useEffect(() => {
    if (poData && !isInitialized) {
      // Set PO Date
      setPoDate(formatDate(poData.poDate));

      // Set Seller Info
      setSellerInfo({
        sellerId: "",
        sellerName: poData.sellerName || "",
        sellerEmail: poData.sellerEmail || "",
        sellerAddress: poData.sellerAddress || "",
        sellerGstNo: poData.sellerGstNo || "",
        sellerPanNo: poData.sellerPanNo || "",
        sellerMsmeNo: poData.sellerMsmeNo || "",
      });

      // Set Ship To Info
      setShipToInfo({
        partyId: "",
        shipToName: poData.shipToName || "",
        shippingAddress: poData.shippingAddress || "",
        shipToGst: poData.shipToGst || "",
        shipToPan: poData.shipToPan || "",
      });

      // Set Products
      if (poData.products && poData.products.length > 0) {
        setProducts(
          poData.products.map((p: any) => ({
            id: generateUniqueId(),
            description: p.description || "",
            hsnSac: p.hsnSac || "",
            qty: Number(p.qty) || 0,
            rate: Number(p.rate) || 0,
            gstRate: Number(p.gstRate) || 18,
          }))
        );
      }

      // Set Optional Fields
      setQuotationNo(poData.quotationNo || "");
      setQuotationDate(poData.quotationDate ? formatDate(poData.quotationDate) : "");
      setPaymentTerms(poData.paymentTerms || "");
      setDeliveryPeriod(poData.deliveryPeriod || "");
      setRemarks(poData.remarks || "");

      // Check if any optional field has value to expand section
      if (
        poData.quotationNo ||
        poData.quotationDate ||
        poData.paymentTerms ||
        poData.deliveryPeriod ||
        poData.remarks
      ) {
        setIsAdvancedOpen(true);
      }

      setIsInitialized(true);
    }
  }, [poData, isInitialized]);

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;

    products.forEach((product) => {
      const lineTotal = product.qty * product.rate;
      const gstAmount = (lineTotal * product.gstRate) / 100;
      subtotal += lineTotal;
      totalGst += gstAmount;
    });

    return {
      subtotal,
      totalGst,
      grandTotal: subtotal + totalGst,
    };
  }, [products]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!sellerInfo.sellerName.trim()) {
      newErrors.seller = "Seller name is required";
    }

    if (!shipToInfo.shipToName.trim() || !shipToInfo.shippingAddress.trim()) {
      newErrors.shipTo = "Ship to name and address are required";
    }

    const validProducts = products.filter(
      (p) => p.description.trim() && p.qty > 0 && p.rate > 0
    );
    if (validProducts.length === 0) {
      newErrors.products = "At least one valid product is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSellerChange = (sellerId: string) => {
    const party = parties.find((p) => p.id.toString() === sellerId);
    if (party) {
      setSellerInfo({
        sellerId,
        sellerName: party.name || "",
        sellerEmail: party.email || "",
        sellerAddress: party.address || "",
        sellerGstNo: party.gstNo || "",
        sellerPanNo: party.pan || "",
        sellerMsmeNo: party.msme || "",
      });
      setErrors((prev) => ({ ...prev, seller: undefined }));
    }
  };

  const handleShipToChange = (partyId: string) => {
    const party = parties.find((p) => p.id.toString() === partyId);
    if (party) {
      setShipToInfo({
        partyId,
        shipToName: party.name || "",
        shippingAddress: party.address || "",
        shipToGst: party.gstNo || "",
        shipToPan: party.pan || "",
      });
      setErrors((prev) => ({ ...prev, shipTo: undefined }));
    }
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: generateUniqueId(),
        description: "",
        hsnSac: "",
        qty: 0,
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const updateProduct = (
    id: string,
    field: keyof Product,
    value: string | number
  ) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setErrors((prev) => ({ ...prev, products: undefined }));
  };

  const duplicateProduct = (id: string) => {
    const productToDuplicate = products.find((p) => p.id === id);
    if (productToDuplicate) {
      const index = products.findIndex((p) => p.id === id);
      const newProduct = { ...productToDuplicate, id: generateUniqueId() };
      const newProducts = [...products];
      newProducts.splice(index + 1, 0, newProduct);
      setProducts(newProducts);
    }
  };

  const handleAddNewParty = async () => {
    if (!newParty.name.trim()) {
      toast.error("Party name is required");
      return;
    }

    try {
      const partyData: CreatePartyDTO = {
        name: newParty.name,
        email: newParty.email || undefined,
        address: newParty.address || undefined,
        gstNo: newParty.gstNo || undefined,
        pan: newParty.pan || undefined,
        msme: newParty.msme || undefined,
      };

      await createPartyMutation.mutateAsync(partyData);

      toast.success(`Party "${newParty.name}" has been added successfully.`);

      setNewParty({
        name: "",
        email: "",
        address: "",
        gstNo: "",
        pan: "",
        msme: "",
      });
      setIsAddPartyOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to add party. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    try {
      const validProducts = products
        .filter((p) => p.description.trim() && p.qty > 0 && p.rate > 0)
        .map((p) => ({
          description: p.description,
          hsnSac: p.hsnSac,
          qty: p.qty,
          rate: p.rate,
          gstRate: p.gstRate,
        }));

      const updateData: UpdatePurchaseOrderDTO = {
        poDate,
        sellerId: sellerInfo.sellerId ? Number(sellerInfo.sellerId) : undefined,
        sellerName: sellerInfo.sellerName,
        sellerEmail: sellerInfo.sellerEmail,
        sellerAddress: sellerInfo.sellerAddress,
        sellerGstNo: sellerInfo.sellerGstNo,
        sellerPanNo: sellerInfo.sellerPanNo,
        sellerMsmeNo: sellerInfo.sellerMsmeNo,
        shipToName: shipToInfo.shipToName,
        shippingAddress: shipToInfo.shippingAddress,
        shipToGst: shipToInfo.shipToGst,
        shipToPan: shipToInfo.shipToPan,
        products: validProducts,
        quotationNo: quotationNo || undefined,
        quotationDate: quotationDate || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryPeriod: deliveryPeriod || undefined,
        remarks: remarks || undefined,
      };

      await updatePOMutation.mutateAsync({
        id: Number(purchaseOrderId),
        data: updateData,
      });

      toast.success(`PO #${poData?.poNumber} has been updated successfully.`);
      navigate(paths.operations.projectDashboard(projectId));
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to update purchase order. Please try again."
      );
    }
  };

  // Loading state
  if (isPOLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <FormSkeleton />
      </div>
    );
  }

  // Error state
  if (isPOError || !poData) {
    return (
      <NotFound
        message={
          (poError as any)?.message ||
          "The purchase order you're looking for doesn't exist or has been removed."
        }
        onBack={() => navigate(-1)}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Edit Purchase Order
              </h1>
              <p className="text-muted-foreground">
                {poData?.projectName || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-mono">
              <Hash className="mr-1 h-3 w-3" />
              {poData?.poNumber || "N/A"}
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Calendar className="mr-2 h-3 w-3" />
              Created:{" "}
              {new Date(poData?.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {errors.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PO Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PO Details
              </CardTitle>
              <CardDescription>
                Basic purchase order information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    PO Number
                  </Label>
                  <Input
                    value={poData?.poNumber || ""}
                    readOnly
                    className="bg-muted font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Project Name
                  </Label>
                  <Input
                    className="bg-muted"
                    value={poData?.projectName || ""}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    PO Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seller Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Seller Information
                  </CardTitle>
                  <CardDescription>
                    Select or enter seller/vendor details
                  </CardDescription>
                </div>
                <Dialog open={isAddPartyOpen} onOpenChange={setIsAddPartyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Party
                    </Button>
                  </DialogTrigger>
                  <AddPartyDialog
                    newParty={newParty}
                    setNewParty={setNewParty}
                    onSubmit={handleAddNewParty}
                    onClose={() => setIsAddPartyOpen(false)}
                    isLoading={createPartyMutation.isPending}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.seller && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.seller}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Replace with Existing Seller</Label>
                  <Select
                    value={sellerInfo.sellerId}
                    onValueChange={handleSellerChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a seller to replace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isPartiesLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Loading parties...
                        </div>
                      ) : parties.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Info className="h-4 w-4 mx-auto mb-2" />
                          No parties found. Add a new one!
                        </div>
                      ) : (
                        parties.map((party) => (
                          <SelectItem key={party.id} value={party.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{party.name}</span>
                              {party.gstNo && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  GST
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Seller Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={sellerInfo.sellerName}
                    onChange={(e) =>
                      setSellerInfo({ ...sellerInfo, sellerName: e.target.value })
                    }
                    placeholder="Enter seller name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Seller Email
                  </Label>
                  <Input
                    type="email"
                    value={sellerInfo.sellerEmail}
                    onChange={(e) =>
                      setSellerInfo({ ...sellerInfo, sellerEmail: e.target.value })
                    }
                    placeholder="seller@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={sellerInfo.sellerGstNo}
                    onChange={(e) =>
                      setSellerInfo({
                        ...sellerInfo,
                        sellerGstNo: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className="font-mono"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Seller Address
                </Label>
                <Textarea
                  value={sellerInfo.sellerAddress}
                  onChange={(e) =>
                    setSellerInfo({ ...sellerInfo, sellerAddress: e.target.value })
                  }
                  placeholder="Enter complete address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={sellerInfo.sellerPanNo}
                    onChange={(e) =>
                      setSellerInfo({
                        ...sellerInfo,
                        sellerPanNo: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. ABCDE1234F"
                    className="font-mono"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MSME Number</Label>
                  <Input
                    value={sellerInfo.sellerMsmeNo}
                    onChange={(e) =>
                      setSellerInfo({
                        ...sellerInfo,
                        sellerMsmeNo: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. UDYAM-XX-00-0000000"
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ship To Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Ship To Details
                  </CardTitle>
                  <CardDescription>
                    Delivery destination information
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Party
                    </Button>
                  </DialogTrigger>
                  <AddPartyDialog
                    newParty={newParty}
                    setNewParty={setNewParty}
                    onSubmit={handleAddNewParty}
                    onClose={() => {}}
                    isLoading={createPartyMutation.isPending}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.shipTo && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.shipTo}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Replace with Existing Destination</Label>
                  <Select
                    value={shipToInfo.partyId}
                    onValueChange={handleShipToChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose destination to replace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isPartiesLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Loading parties...
                        </div>
                      ) : parties.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Info className="h-4 w-4 mx-auto mb-2" />
                          No parties found. Add a new one!
                        </div>
                      ) : (
                        parties.map((party) => (
                          <SelectItem key={party.id} value={party.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span>{party.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Ship To Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={shipToInfo.shipToName}
                    onChange={(e) =>
                      setShipToInfo({ ...shipToInfo, shipToName: e.target.value })
                    }
                    placeholder="Enter recipient name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Shipping Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={shipToInfo.shippingAddress}
                  onChange={(e) =>
                    setShipToInfo({
                      ...shipToInfo,
                      shippingAddress: e.target.value,
                    })
                  }
                  placeholder="Enter complete shipping address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={shipToInfo.shipToGst}
                    onChange={(e) =>
                      setShipToInfo({
                        ...shipToInfo,
                        shipToGst: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className="font-mono"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={shipToInfo.shipToPan}
                    onChange={(e) =>
                      setShipToInfo({
                        ...shipToInfo,
                        shipToPan: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. ABCDE1234F"
                    className="font-mono"
                    maxLength={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products / Services
                    <Badge variant="secondary" className="ml-2">
                      {products.length} {products.length === 1 ? "item" : "items"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Edit products or services in this purchase order
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProduct}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {errors.products && (
                <Alert variant="destructive" className="m-4 mb-0">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.products}</AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[5%] text-center">#</TableHead>
                      <TableHead className="w-[28%]">
                        Description <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="w-[12%]">
                        HSN/SAC <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="w-[10%] text-right">
                        Qty <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="w-[13%] text-right">
                        Rate (₹) <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="w-[10%] text-right">
                        GST % <span className="text-destructive">*</span>
                      </TableHead>
                      <TableHead className="w-[14%] text-right">Amount</TableHead>
                      <TableHead className="w-[8%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, index) => {
                      const lineTotal = product.qty * product.rate;
                      const gstAmount = (lineTotal * product.gstRate) / 100;
                      const totalWithGst = lineTotal + gstAmount;

                      return (
                        <TableRow key={product.id} className="group">
                          <TableCell className="text-center text-muted-foreground font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={product.description}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Enter product description"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={product.hsnSac}
                              onChange={(e) =>
                                updateProduct(product.id, "hsnSac", e.target.value)
                              }
                              placeholder="HSN/SAC"
                              className="font-mono text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              value={product.qty || ""}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "qty",
                                  Number(e.target.value)
                                )
                              }
                              placeholder="0"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.rate || ""}
                              onChange={(e) =>
                                updateProduct(
                                  product.id,
                                  "rate",
                                  Number(e.target.value)
                                )
                              }
                              placeholder="0.00"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select
                              value={product.gstRate.toString()}
                              onValueChange={(value) =>
                                updateProduct(product.id, "gstRate", Number(value))
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2 text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-semibold cursor-help">
                                  {formatCurrency(totalWithGst)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="p-3">
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      Subtotal:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(lineTotal)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      GST ({product.gstRate}%):
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(gstAmount)}
                                    </span>
                                  </div>
                                  <Separator className="my-1" />
                                  <div className="flex justify-between gap-4 font-semibold">
                                    <span>Total:</span>
                                    <span>{formatCurrency(totalWithGst)}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => duplicateProduct(product.id)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeProduct(product.id)}
                                    disabled={products.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-right font-medium"
                      >
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calculations.subtotal)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-right font-medium"
                      >
                        Total GST
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calculations.totalGst)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-right font-bold text-lg"
                      >
                        Grand Total
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(calculations.grandTotal)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Additional Details
                        <Badge variant="outline" className="ml-2">
                          Optional
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Quotation, payment terms, and remarks
                      </CardDescription>
                    </div>
                    {isAdvancedOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Quotation Number</Label>
                      <Input
                        value={quotationNo}
                        onChange={(e) => setQuotationNo(e.target.value)}
                        placeholder="e.g. QTN-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quotation Date</Label>
                      <Input
                        type="date"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Textarea
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        placeholder="e.g. 30 days from invoice date"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Period</Label>
                      <Input
                        value={deliveryPeriod}
                        onChange={(e) => setDeliveryPeriod(e.target.value)}
                        placeholder="e.g. 15-20 working days"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Any additional notes or remarks..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Separator />

          {/* Form Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total PO Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculations.grandTotal)}
                  </p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <p className="font-semibold">{products.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-semibold">
                    {formatCurrency(calculations.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">GST</p>
                  <p className="font-semibold">
                    {formatCurrency(calculations.totalGst)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePOMutation.isPending}
                className="min-w-[160px]"
              >
                {updatePOMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}

/* ================================
   ADD PARTY DIALOG COMPONENT
================================ */
interface AddPartyDialogProps {
  newParty: NewPartyForm;
  setNewParty: React.Dispatch<React.SetStateAction<NewPartyForm>>;
  onSubmit: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const AddPartyDialog: React.FC<AddPartyDialogProps> = ({
  newParty,
  setNewParty,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New Party
        </DialogTitle>
        <DialogDescription>
          Add a new party to use as seller or shipping destination.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Party Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={newParty.name}
              onChange={(e) =>
                setNewParty({ ...newParty, name: e.target.value })
              }
              placeholder="Enter party name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={newParty.email}
              onChange={(e) =>
                setNewParty({ ...newParty, email: e.target.value })
              }
              placeholder="example@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea
            value={newParty.address}
            onChange={(e) =>
              setNewParty({ ...newParty, address: e.target.value })
            }
            placeholder="Enter complete address"
            rows={2}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              GST Number
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  15-character GST identification number
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              value={newParty.gstNo}
              onChange={(e) =>
                setNewParty({ ...newParty, gstNo: e.target.value.toUpperCase() })
              }
              placeholder="27ABCDE1234F1Z5"
              className="font-mono"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              PAN Number
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  10-character Permanent Account Number
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              value={newParty.pan}
              onChange={(e) =>
                setNewParty({ ...newParty, pan: e.target.value.toUpperCase() })
              }
              placeholder="ABCDE1234F"
              className="font-mono"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              MSME Number
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Udyam Registration Number</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              value={newParty.msme}
              onChange={(e) =>
                setNewParty({ ...newParty, msme: e.target.value.toUpperCase() })
              }
              placeholder="UDYAM-XX-00-0000000"
              className="font-mono"
            />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!newParty.name.trim() || isLoading}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Party
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};