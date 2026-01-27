// src/pages/project-dashboard/RaisePO.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Package,
    Building2,
    Truck,
    FileText,
    Save,
    UserPlus,
    Calculator,
    Calendar,
    Hash,
    Mail,
    MapPin,
    CreditCard,
    FileCheck,
    Loader2,
} from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ================================
   TYPES
================================ */
interface Party {
    id: number;
    name: string;
    email: string;
    address: string;
    gst_no: string;
    pan: string;
    msme: string;
}

interface Product {
    id: string;
    description: string;
    hsn_sac: string;
    qty: number;
    rate: number;
    gst_rate: number;
}

interface SellerInfo {
    seller_id: string;
    seller_name: string;
    seller_email: string;
    seller_address: string;
    seller_gst_no: string;
    seller_pan_no: string;
    seller_msme_no: string;
}

interface ShipToInfo {
    party_id: string;
    ship_to_name: string;
    shipping_address: string;
    ship_to_gst: string;
    ship_to_pan: string;
}

interface NewPartyForm {
    name: string;
    email: string;
    address: string;
    gst_no: string;
    pan: string;
    msme: string;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_PARTIES: Party[] = [
    {
        id: 1,
        name: "ABC Steel Suppliers Pvt Ltd",
        email: "sales@abcsteel.com",
        address: "Plot No. 45, Industrial Area Phase-2, Sector 56, Gurugram, Haryana - 122011",
        gst_no: "06AABCA1234F1Z5",
        pan: "AABCA1234F",
        msme: "UDYAM-HR-01-0012345",
    },
    {
        id: 2,
        name: "XYZ Cement Corporation",
        email: "orders@xyzcement.in",
        address: "Survey No. 123, MIDC Taloja, Navi Mumbai, Maharashtra - 410208",
        gst_no: "27AADCX5678G1Z8",
        pan: "AADCX5678G",
        msme: "",
    },
    {
        id: 3,
        name: "Tech Solutions India",
        email: "info@techsolutions.co.in",
        address: "2nd Floor, Tower B, Cyber City, DLF Phase 3, Gurugram - 122002",
        gst_no: "06AAECT9012H1Z3",
        pan: "AAECT9012H",
        msme: "UDYAM-HR-02-0098765",
    },
    {
        id: 4,
        name: "Heavy Machinery Ltd",
        email: "procurement@heavymachinery.com",
        address: "Industrial Estate, Bhiwadi, Rajasthan - 301019",
        gst_no: "08AABHM3456J1Z1",
        pan: "AABHM3456J",
        msme: "",
    },
    {
        id: 5,
        name: "Smart City Infrastructure Depot",
        email: "depot@smartcity.gov.in",
        address: "Municipal Corporation Office, Sector 17, Chandigarh - 160017",
        gst_no: "04AAGCS7890K1Z6",
        pan: "AAGCS7890K",
        msme: "",
    },
];

const TENDER_INFO = {
    id: 101,
    tender_name: "Smart City Infrastructure Development Project - Phase 1",
    tender_number: "TND-2024-00145",
};

const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    return `PO-${year}${month}-${random}`;
};

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

const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/* ================================
   MAIN COMPONENT
================================ */
export default function RaisePoFormPage() {
    const navigate = useNavigate();

    // Form States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
    const [parties, setParties] = useState<Party[]>(DUMMY_PARTIES);

    // PO Details
    const poNumber = useMemo(() => generatePONumber(), []);
    const currentDate = new Date();

    // Seller Information
    const [sellerInfo, setSellerInfo] = useState<SellerInfo>({
        seller_id: "",
        seller_name: "",
        seller_email: "",
        seller_address: "",
        seller_gst_no: "",
        seller_pan_no: "",
        seller_msme_no: "",
    });

    // Ship To Information
    const [shipToInfo, setShipToInfo] = useState<ShipToInfo>({
        party_id: "",
        ship_to_name: "",
        shipping_address: "",
        ship_to_gst: "",
        ship_to_pan: "",
    });

    // Products
    const [products, setProducts] = useState<Product[]>([
        {
            id: generateUniqueId(),
            description: "",
            hsn_sac: "",
            qty: 0,
            rate: 0,
            gst_rate: 18,
        },
    ]);

    // New Party Form
    const [newParty, setNewParty] = useState<NewPartyForm>({
        name: "",
        email: "",
        address: "",
        gst_no: "",
        pan: "",
        msme: "",
    });

    // Calculations
    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalGst = 0;

        products.forEach(product => {
            const lineTotal = product.qty * product.rate;
            const gstAmount = (lineTotal * product.gst_rate) / 100;
            subtotal += lineTotal;
            totalGst += gstAmount;
        });

        return {
            subtotal,
            totalGst,
            grandTotal: subtotal + totalGst,
        };
    }, [products]);

    // Handlers
    const handleSellerChange = (sellerId: string) => {
        const party = parties.find(p => p.id.toString() === sellerId);
        if (party) {
            setSellerInfo({
                seller_id: sellerId,
                seller_name: party.name,
                seller_email: party.email,
                seller_address: party.address,
                seller_gst_no: party.gst_no,
                seller_pan_no: party.pan,
                seller_msme_no: party.msme,
            });
        }
    };

    const handleShipToChange = (partyId: string) => {
        const party = parties.find(p => p.id.toString() === partyId);
        if (party) {
            setShipToInfo({
                party_id: partyId,
                ship_to_name: party.name,
                shipping_address: party.address,
                ship_to_gst: party.gst_no,
                ship_to_pan: party.pan,
            });
        }
    };

    const addProduct = () => {
        setProducts([
            ...products,
            {
                id: generateUniqueId(),
                description: "",
                hsn_sac: "",
                qty: 0,
                rate: 0,
                gst_rate: 18,
            },
        ]);
    };

    const removeProduct = (id: string) => {
        if (products.length > 1) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const updateProduct = (id: string, field: keyof Product, value: string | number) => {
        setProducts(products.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    };

    const handleAddNewParty = () => {
        if (!newParty.name.trim()) {
            return;
        }

        const newPartyData: Party = {
            id: Date.now(),
            ...newParty,
        };

        setParties([...parties, newPartyData]);
        setNewParty({
            name: "",
            email: "",
            address: "",
            gst_no: "",
            pan: "",
            msme: "",
        });
        setIsAddPartyOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log({
            po_number: poNumber,
            tender_id: TENDER_INFO.id,
            seller_info: sellerInfo,
            ship_to_info: shipToInfo,
            products,
            calculations,
        });

        setIsSubmitting(false);
        // navigate back or show success
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-12">
                <div className="mx-auto max-w-6xl p-6 space-y-6">
                    {/* ===== HEADER ===== */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Raise Purchase Order</h1>
                                <p className="text-muted-foreground">Create a new PO for {TENDER_INFO.tender_name}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-sm px-3 py-1">
                            <FileText className="mr-2 h-4 w-4" />
                            {TENDER_INFO.tender_number}
                        </Badge>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ===== PO DETAILS ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    PO Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                            PO Number
                                        </Label>
                                        <Input value={poNumber} readOnly className="bg-muted/50 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            Project Name
                                        </Label>
                                        <Input value={TENDER_INFO.tender_name} readOnly className="bg-muted/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Date
                                        </Label>
                                        <Input value={formatDate(currentDate)} readOnly className="bg-muted/50" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ===== SELLER INFORMATION ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                            <Building2 className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        Seller Information
                                    </CardTitle>
                                    <Dialog open={isAddPartyOpen} onOpenChange={setIsAddPartyOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add New Party
                                            </Button>
                                        </DialogTrigger>
                                        <AddPartyDialog newParty={newParty} setNewParty={setNewParty} onSubmit={handleAddNewParty} onClose={() => setIsAddPartyOpen(false)} />
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Select Seller</Label>
                                        <Select value={sellerInfo.seller_id} onValueChange={handleSellerChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a seller..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {parties.map(party => (
                                                    <SelectItem key={party.id} value={party.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            {party.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Seller Name</Label>
                                        <Input
                                            value={sellerInfo.seller_name}
                                            onChange={e => setSellerInfo({ ...sellerInfo, seller_name: e.target.value })}
                                            placeholder="Enter seller name"
                                            className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            Seller Email
                                        </Label>
                                        <Input
                                            type="email"
                                            value={sellerInfo.seller_email}
                                            onChange={e => setSellerInfo({ ...sellerInfo, seller_email: e.target.value })}
                                            placeholder="seller@example.com"
                                            className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-1">{/* Empty for layout balance */}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        Seller Address
                                    </Label>
                                    <Textarea
                                        value={sellerInfo.seller_address}
                                        onChange={e => setSellerInfo({ ...sellerInfo, seller_address: e.target.value })}
                                        placeholder="Enter complete address"
                                        rows={2}
                                        className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">GST Number</Label>
                                        <Input
                                            value={sellerInfo.seller_gst_no}
                                            onChange={e => setSellerInfo({ ...sellerInfo, seller_gst_no: e.target.value })}
                                            placeholder="e.g. 27ABCDE1234F1Z5"
                                            className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">PAN Number</Label>
                                        <Input
                                            value={sellerInfo.seller_pan_no}
                                            onChange={e => setSellerInfo({ ...sellerInfo, seller_pan_no: e.target.value })}
                                            placeholder="e.g. ABCDE1234F"
                                            className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">MSME Number</Label>
                                        <Input
                                            value={sellerInfo.seller_msme_no}
                                            onChange={e => setSellerInfo({ ...sellerInfo, seller_msme_no: e.target.value })}
                                            placeholder="e.g. UDYAM-XX-00-0000000"
                                            className={sellerInfo.seller_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ===== SHIP TO DETAILS ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="p-2 bg-sky-100 rounded-lg">
                                            <Truck className="h-4 w-4 text-sky-600" />
                                        </div>
                                        Ship To Details
                                    </CardTitle>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add New Party
                                            </Button>
                                        </DialogTrigger>
                                        <AddPartyDialog newParty={newParty} setNewParty={setNewParty} onSubmit={handleAddNewParty} onClose={() => {}} />
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Select Party</Label>
                                        <Select value={shipToInfo.party_id} onValueChange={handleShipToChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose shipping destination..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {parties.map(party => (
                                                    <SelectItem key={party.id} value={party.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                                            {party.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Ship To Name *</Label>
                                        <Input
                                            value={shipToInfo.ship_to_name}
                                            onChange={e => setShipToInfo({ ...shipToInfo, ship_to_name: e.target.value })}
                                            placeholder="Enter recipient name"
                                            required
                                            className={shipToInfo.party_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        Shipping Address *
                                    </Label>
                                    <Textarea
                                        value={shipToInfo.shipping_address}
                                        onChange={e => setShipToInfo({ ...shipToInfo, shipping_address: e.target.value })}
                                        placeholder="Enter complete shipping address"
                                        rows={2}
                                        required
                                        className={shipToInfo.party_id ? "bg-muted/30" : ""}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">GST Number</Label>
                                        <Input
                                            value={shipToInfo.ship_to_gst}
                                            onChange={e => setShipToInfo({ ...shipToInfo, ship_to_gst: e.target.value })}
                                            placeholder="e.g. 27ABCDE1234F1Z5"
                                            className={shipToInfo.party_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">PAN Number</Label>
                                        <Input
                                            value={shipToInfo.ship_to_pan}
                                            onChange={e => setShipToInfo({ ...shipToInfo, ship_to_pan: e.target.value })}
                                            placeholder="e.g. ABCDE1234F"
                                            className={shipToInfo.party_id ? "bg-muted/30" : ""}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ===== PRODUCTS ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="p-2 bg-amber-100 rounded-lg">
                                            <Package className="h-4 w-4 text-amber-600" />
                                        </div>
                                        Products / Services
                                        <Badge variant="secondary" className="ml-2">
                                            {products.length} items
                                        </Badge>
                                    </CardTitle>
                                    <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Product
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[30%]">Description *</TableHead>
                                                <TableHead className="w-[15%]">HSN/SAC *</TableHead>
                                                <TableHead className="w-[12%] text-right">Qty *</TableHead>
                                                <TableHead className="w-[15%] text-right">Rate (₹) *</TableHead>
                                                <TableHead className="w-[10%] text-right">GST % *</TableHead>
                                                <TableHead className="w-[13%] text-right">Amount</TableHead>
                                                <TableHead className="w-[5%]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product, index) => {
                                                const lineTotal = product.qty * product.rate;
                                                const gstAmount = (lineTotal * product.gst_rate) / 100;
                                                const totalWithGst = lineTotal + gstAmount;

                                                return (
                                                    <TableRow key={product.id} className="group">
                                                        <TableCell className="p-2">
                                                            <Input
                                                                value={product.description}
                                                                onChange={e => updateProduct(product.id, "description", e.target.value)}
                                                                placeholder="Enter product description"
                                                                required
                                                                className="border-0 bg-transparent focus-visible:ring-1"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input
                                                                value={product.hsn_sac}
                                                                onChange={e => updateProduct(product.id, "hsn_sac", e.target.value)}
                                                                placeholder="HSN/SAC"
                                                                required
                                                                className="border-0 bg-transparent focus-visible:ring-1 font-mono text-sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={product.qty || ""}
                                                                onChange={e => updateProduct(product.id, "qty", Number(e.target.value))}
                                                                placeholder="0"
                                                                required
                                                                className="border-0 bg-transparent focus-visible:ring-1 text-right"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={product.rate || ""}
                                                                onChange={e => updateProduct(product.id, "rate", Number(e.target.value))}
                                                                placeholder="0.00"
                                                                required
                                                                className="border-0 bg-transparent focus-visible:ring-1 text-right"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                value={product.gst_rate || ""}
                                                                onChange={e => updateProduct(product.id, "gst_rate", Number(e.target.value))}
                                                                placeholder="18"
                                                                required
                                                                className="border-0 bg-transparent focus-visible:ring-1 text-right"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2 text-right">
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <span className="font-medium">{formatCurrency(totalWithGst)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left">
                                                                    <div className="text-xs space-y-1">
                                                                        <div>Subtotal: {formatCurrency(lineTotal)}</div>
                                                                        <div>GST: {formatCurrency(gstAmount)}</div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => removeProduct(product.id)}
                                                                disabled={products.length === 1}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableFooter className="bg-muted/30">
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-right font-medium">
                                                    Subtotal
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(calculations.subtotal)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-right font-medium">
                                                    Total GST
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(calculations.totalGst)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                            <TableRow className="bg-primary/5">
                                                <TableCell colSpan={5} className="text-right font-bold text-lg">
                                                    Grand Total
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-lg text-primary">{formatCurrency(calculations.grandTotal)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ===== SUMMARY & SUBMIT ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-primary/10 rounded-xl">
                                                <Calculator className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total PO Value</p>
                                                <p className="text-2xl font-bold text-primary">{formatCurrency(calculations.grandTotal)}</p>
                                            </div>
                                        </div>
                                        <Separator orientation="vertical" className="h-12 hidden md:block" />
                                        <div className="hidden md:block">
                                            <p className="text-sm text-muted-foreground">Items</p>
                                            <p className="text-xl font-semibold">{products.length}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Submit PO
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </div>
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
}

const AddPartyDialog: React.FC<AddPartyDialogProps> = ({ newParty, setNewParty, onSubmit, onClose }) => {
    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    Add New Party
                </DialogTitle>
                <DialogDescription>Add a new party to use as seller or shipping destination</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Party Name *</Label>
                        <Input value={newParty.name} onChange={e => setNewParty({ ...newParty, name: e.target.value })} placeholder="Enter party name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newParty.email} onChange={e => setNewParty({ ...newParty, email: e.target.value })} placeholder="example@email.com" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea value={newParty.address} onChange={e => setNewParty({ ...newParty, address: e.target.value })} placeholder="Enter complete address" rows={2} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>GST Number</Label>
                        <Input value={newParty.gst_no} onChange={e => setNewParty({ ...newParty, gst_no: e.target.value })} placeholder="27ABCDE1234F1Z5" />
                    </div>
                    <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input value={newParty.pan} onChange={e => setNewParty({ ...newParty, pan: e.target.value })} placeholder="ABCDE1234F" />
                    </div>
                    <div className="space-y-2">
                        <Label>MSME Number</Label>
                        <Input value={newParty.msme} onChange={e => setNewParty({ ...newParty, msme: e.target.value })} placeholder="UDYAM-XX-00-0000000" />
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="button" onClick={onSubmit} disabled={!newParty.name.trim()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Party
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};
