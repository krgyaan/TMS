import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Laptop,
  Smartphone,
  Monitor,
  Headphones,
  Mouse,
  Keyboard,
  HardDrive,
  Printer,
  Package,
  Search,
  CalendarDays,
  Hash,
  Barcode,
  ShieldCheck,
  Info,
  ChevronRight,
  BoxSelect,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { staggerContainer, fadeInUp, tabContentVariants } from "../animations";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  assetType: string;
  assetCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetStatus: string;
  assetCondition: string;
  assignedDate: string;
  returnDate?: string;
  specifications?: string;
  remarks?: string;
}

// ─── ASSET ICON MAP ──────────────────────────────────────────────────────────

const ASSET_ICON_MAP: Record<string, React.ElementType> = {
  laptop: Laptop,
  phone: Smartphone,
  mobile: Smartphone,
  smartphone: Smartphone,
  monitor: Monitor,
  display: Monitor,
  headphone: Headphones,
  headset: Headphones,
  mouse: Mouse,
  keyboard: Keyboard,
  "hard drive": HardDrive,
  hdd: HardDrive,
  ssd: HardDrive,
  printer: Printer,
};

function getAssetIcon(assetType: string): React.ElementType {
  const lower = assetType.toLowerCase();
  for (const [key, icon] of Object.entries(ASSET_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return Package;
}

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  dotColor: string;
}

function getAssetStatusConfig(status: string): StatusConfig {
  const lower = status.toLowerCase();
  if (lower === "assigned" || lower === "active" || lower === "in use") {
    return {
      label: status,
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      dotColor: "bg-emerald-500",
    };
  }
  if (lower === "returned" || lower === "inactive") {
    return {
      label: status,
      icon: XCircle,
      className: "bg-muted/50 text-muted-foreground border-border/30",
      dotColor: "bg-muted-foreground",
    };
  }
  if (lower === "maintenance" || lower === "repair") {
    return {
      label: status,
      icon: AlertTriangle,
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      dotColor: "bg-amber-500",
    };
  }
  if (lower === "lost" || lower === "damaged") {
    return {
      label: status,
      icon: XCircle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
      dotColor: "bg-destructive",
    };
  }
  return {
    label: status,
    icon: Clock,
    className: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
  };
}

// ─── CONDITION CONFIG ────────────────────────────────────────────────────────

function getConditionConfig(condition: string) {
  const lower = condition.toLowerCase();
  if (lower === "new" || lower === "excellent") {
    return { color: "text-emerald-600", bg: "bg-emerald-500/10" };
  }
  if (lower === "good") {
    return { color: "text-blue-600", bg: "bg-blue-500/10" };
  }
  if (lower === "fair" || lower === "average") {
    return { color: "text-amber-600", bg: "bg-amber-500/10" };
  }
  if (lower === "poor" || lower === "damaged") {
    return { color: "text-destructive", bg: "bg-destructive/10" };
  }
  return { color: "text-muted-foreground", bg: "bg-muted/30" };
}

// ─── ASSET DETAIL DIALOG ────────────────────────────────────────────────────

interface AssetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

const AssetDetailDialog: React.FC<AssetDetailDialogProps> = ({
  open,
  onOpenChange,
  asset,
}) => {
  if (!asset) return null;

  const AssetIcon = getAssetIcon(asset.assetType);
  const statusConfig = getAssetStatusConfig(asset.assetStatus);
  const StatusIcon = statusConfig.icon;
  const conditionConfig = getConditionConfig(asset.assetCondition);

  const details = [
    { label: "Asset Code", value: asset.assetCode, icon: Hash, mono: true },
    {
      label: "Serial Number",
      value: asset.serialNumber,
      icon: Barcode,
      mono: true,
    },
    { label: "Brand", value: asset.brand, icon: Package },
    { label: "Model", value: asset.model, icon: Info },
    { label: "Type", value: asset.assetType, icon: BoxSelect },
    {
      label: "Assigned Date",
      value: formatDate(asset.assignedDate),
      icon: CalendarDays,
    },
    ...(asset.returnDate
      ? [
          {
            label: "Return Date",
            value: formatDate(asset.returnDate),
            icon: CalendarDays,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                  <AssetIcon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    {asset.brand} {asset.model}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5 flex items-center gap-2">
                    <span>{asset.assetType}</span>
                    <span className="text-primary/20">•</span>
                    <span className="font-mono">{asset.assetCode}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Status + Condition Row */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-xs h-8 font-bold rounded-xl px-3",
                statusConfig.className
              )}
            >
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {statusConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs h-8 font-bold rounded-xl px-3",
                conditionConfig.bg,
                conditionConfig.color,
                "border-transparent"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              {asset.assetCondition}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {details.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.label}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <ItemIcon className="h-3 w-3 text-muted-foreground/50" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {item.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      item.mono && "font-mono"
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Specifications */}
          {asset.specifications && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Specifications
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {asset.specifications}
              </p>
            </div>
          )}

          {/* Remarks */}
          {asset.remarks && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-0.5">
                  Remarks
                </p>
                <p className="text-xs text-amber-600/80 leading-relaxed">
                  {asset.remarks}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── ASSET CARD ─────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: Asset;
  index: number;
  onClick: (asset: Asset) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, index, onClick }) => {
  const AssetIcon = getAssetIcon(asset.assetType);
  const statusConfig = getAssetStatusConfig(asset.assetStatus);
  const StatusIcon = statusConfig.icon;
  const conditionConfig = getConditionConfig(asset.assetCondition);

  return (
    <motion.div
      variants={fadeInUp}
      custom={index}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="border-border/40 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-400 group bg-muted/20 backdrop-blur-sm overflow-hidden h-full cursor-pointer"
        onClick={() => onClick(asset)}
      >
        <CardContent className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
              <AssetIcon className="h-7 w-7 text-primary/60 group-hover:text-primary-foreground transition-colors" />
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-6 font-bold rounded-lg",
                statusConfig.className
              )}
            >
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full mr-1.5 animate-pulse",
                  statusConfig.dotColor
                )}
              />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Title */}
          <h4 className="font-bold text-sm group-hover:text-primary transition-colors">
            {asset.brand} {asset.model}
          </h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
            {asset.assetType}
          </p>

          {/* Details */}
          <div className="mt-auto pt-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                Asset Code
              </span>
              <span className="font-mono font-semibold text-foreground/80">
                {asset.assetCode}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Barcode className="h-3 w-3" />
                Serial
              </span>
              <span className="font-mono font-semibold text-foreground/80 truncate ml-4 max-w-[140px]">
                {asset.serialNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                Condition
              </span>
              <span
                className={cn(
                  "font-semibold px-2 py-0.5 rounded-md text-[11px]",
                  conditionConfig.bg,
                  conditionConfig.color
                )}
              >
                {asset.assetCondition}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" />
                Since
              </span>
              <span className="font-semibold text-foreground/80">
                {formatDate(asset.assignedDate)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                View details
              </span>
              <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── MAIN ASSETS SECTION ────────────────────────────────────────────────────

export const AssetsSection: React.FC = () => {
  const { data } = useProfileContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!data) return null;

  const ASSETS: Asset[] = data?.assets || [];

  // Unique asset types for filtering
  const assetTypes = [...new Set(ASSETS.map((a) => a.assetType))];

  // Filtered assets
  const filtered = ASSETS.filter((asset) => {
    const matchesFilter =
      activeFilter === "all" || asset.assetType === activeFilter;
    const matchesSearch =
      !searchQuery ||
      `${asset.brand} ${asset.model}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Stats
  const activeCount = ASSETS.filter((a) =>
    ["assigned", "active", "in use"].includes(a.assetStatus.toLowerCase())
  ).length;
  const totalCount = ASSETS.length;

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  // ─── EMPTY STATE ────────────────────────────────────────────────────────
  if (ASSETS.length === 0) {
    return (
      <motion.div
        key="assets"
        variants={tabContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={fadeInUp}>
            <Card className="border-dashed border-2 border-border/30 bg-muted/10 backdrop-blur-sm">
              <CardContent className="py-20 px-6">
                <div className="text-center max-w-sm mx-auto">
                  {/* Animated Icon Stack */}
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                      animate={{ opacity: 1, scale: 1, rotate: -12 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="absolute inset-0 h-20 w-20 rounded-2xl bg-muted/40 border border-border/20 flex items-center justify-center top-2 left-2"
                    >
                      <Monitor className="h-8 w-8 text-muted-foreground/20" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: 6 }}
                      animate={{ opacity: 1, scale: 1, rotate: 6 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="absolute inset-0 h-20 w-20 rounded-2xl bg-muted/30 border border-border/20 flex items-center justify-center top-0 left-4"
                    >
                      <Keyboard className="h-8 w-8 text-muted-foreground/15" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="absolute h-20 w-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center top-1 left-1 shadow-lg shadow-primary/5"
                    >
                      <Laptop className="h-9 w-9 text-primary/30" />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-lg font-bold mb-2">
                      No Assets Assigned
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                      You don't have any assets assigned to you yet.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Assets like laptops, monitors, and other equipment will
                      appear here once they are assigned to you by your IT or
                      Admin team.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 rounded-2xl bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Info className="h-4 w-4 text-primary/60" />
                      </div>
                      <p className="text-xs text-muted-foreground text-left">
                        If you believe an asset should be assigned to you,
                        please contact your reporting manager or raise a support
                        ticket.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────────────
  return (
    <motion.div
      key="assets"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Summary Banner ─────────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <Card className="border-border/40 shadow-lg shadow-black/[0.02] bg-gradient-to-r from-primary/[0.03] via-background to-primary/[0.02] backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                    <Package className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-0.5">
                      Your Assets
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Equipment and devices assigned to you
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <motion.p
                      className="text-3xl font-black tracking-tight text-primary"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 200,
                      }}
                    >
                      {totalCount}
                    </motion.p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Total
                    </p>
                  </div>
                  <div className="h-10 w-px bg-border/30" />
                  <div className="text-center">
                    <motion.p
                      className="text-3xl font-black tracking-tight text-emerald-600"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 0.4,
                        type: "spring",
                        stiffness: 200,
                      }}
                    >
                      {activeCount}
                    </motion.p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Search + Filters ───────────────────────────────────────── */}
        {ASSETS.length > 3 && (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" },
                ...assetTypes.map((t) => ({ label: t, value: t })),
              ].map((filter) => {
                const FilterIcon =
                  filter.value !== "all"
                    ? getAssetIcon(filter.value)
                    : Package;
                return (
                  <Button
                    key={filter.value}
                    variant={
                      activeFilter === filter.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setActiveFilter(filter.value)}
                    className={cn(
                      "h-8 text-[11px] rounded-xl font-semibold transition-all duration-200 gap-1.5",
                      activeFilter === filter.value &&
                        "shadow-md shadow-primary/20"
                    )}
                  >
                    <FilterIcon className="h-3 w-3" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-xl border-border/40 bg-muted/20 focus:bg-background text-sm"
              />
            </div>
          </motion.div>
        )}

        {/* ── Asset Grid ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="asset-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((asset, index) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  index={index}
                  onClick={handleAssetClick}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card className="border-dashed border-2 border-border/30 bg-muted/10">
                <CardContent className="p-12 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">No assets found</h3>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl text-xs font-semibold"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Asset Type Summary ──────────────────────────────────────── */}
        {ASSETS.length > 1 && (
          <motion.div variants={fadeInUp}>
            <Card className="border-border/30 bg-muted/10 backdrop-blur-sm">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <BoxSelect className="h-3.5 w-3.5" />
                  Asset Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {assetTypes.map((type) => {
                    const TypeIcon = getAssetIcon(type);
                    const count = ASSETS.filter(
                      (a) => a.assetType === type
                    ).length;
                    const activeInType = ASSETS.filter(
                      (a) =>
                        a.assetType === type &&
                        ["assigned", "active", "in use"].includes(
                          a.assetStatus.toLowerCase()
                        )
                    ).length;

                    return (
                      <div
                        key={type}
                        className="p-3.5 rounded-xl border border-border/20 hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
                        onClick={() => setActiveFilter(type)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <TypeIcon className="h-4 w-4 text-primary/60" />
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
                        </div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {type}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black">{count}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({activeInType} active)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* ── Detail Dialog ──────────────────────────────────────────── */}
      <AssetDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        asset={selectedAsset}
      />
    </motion.div>
  );
};