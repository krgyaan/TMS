import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { useMergeVendors, useVendorMergePreview } from "@/hooks/api/useVendorMerge";
import { cn } from "@/lib/utils";
import type { VendorMergeOrgSummary, VendorMergePreview, VendorMergeRefGroup } from "@/types/api.types";
import { AlertCircle, ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

// Mirrors MERGE_ALLOWED_USER_IDS in api/src/modules/master/vendor-master/merge-vendors.guard.ts
const MERGE_ALLOWED_USER_IDS: readonly number[] = [13];

const OrgSummaryCard = ({ title, org }: { title: string; org: VendorMergeOrgSummary }) => (
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
                {title}
                <Badge variant={org.status ? "default" : "secondary"}>{org.status ? "Active" : "Inactive"}</Badge>
            </CardTitle>
            <CardDescription>
                {org.name} (#{org.id})
                {org.pan ? ` · PAN ${org.pan}` : ""}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                    <span className="text-muted-foreground">Alias:</span> {org.alias || "-"}
                </div>
                <div>
                    <span className="text-muted-foreground">MSME:</span> {org.msme || "-"}
                </div>
                <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span> {org.address || "-"}
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                <div className="text-center">
                    <div className="font-semibold">{org._counts.gsts}</div>
                    <div className="text-xs text-muted-foreground">GSTs</div>
                </div>
                <div className="text-center">
                    <div className="font-semibold">{org._counts.persons}</div>
                    <div className="text-xs text-muted-foreground">Persons</div>
                </div>
                <div className="text-center">
                    <div className="font-semibold">{org._counts.accounts}</div>
                    <div className="text-xs text-muted-foreground">Accounts</div>
                </div>
                <div className="text-center">
                    <div className="font-semibold">{org._counts.files}</div>
                    <div className="text-xs text-muted-foreground">Files</div>
                </div>
            </div>
        </CardContent>
    </Card>
);

type VendorSelectProps = {
    value: number | null;
    onChange: (id: number) => void;
    excludeId: number | null;
    placeholder: string;
};

const VendorSelect = ({ value, onChange, excludeId, placeholder }: VendorSelectProps) => {
    const { data: orgs, isLoading } = useVendorOrganizations();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const selected = orgs?.find(org => org.id === value);
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = (orgs ?? []).filter(org => {
        if (org.id === excludeId) return false;
        if (!normalizedQuery) return true;
        return (
            org.name.toLowerCase().includes(normalizedQuery) ||
            org.id.toString().includes(normalizedQuery) ||
            (org.pan ?? "").toLowerCase().includes(normalizedQuery)
        );
    });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className="truncate">
                        {isLoading
                            ? "Loading vendors..."
                            : selected
                              ? `${selected.name} (#${selected.id})`
                              : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search by name, PAN or id..." value={query} onValueChange={setQuery} />
                    <CommandList>
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                            {filtered.map(org => (
                                <CommandItem
                                    key={org.id}
                                    value={`${org.name} ${org.id} ${org.pan ?? ""}`}
                                    onSelect={() => {
                                        onChange(org.id);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === org.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                        <span>
                                            {org.name}
                                            {!org.status && <span className="text-muted-foreground"> (inactive)</span>}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            #{org.id}
                                            {org.pan ? ` · PAN ${org.pan}` : ""}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const VendorMergePage = () => {
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();

    const [keepId, setKeepId] = useState<number | null>(null);
    const [dropId, setDropId] = useState<number | null>(null);

    const { data: preview, isLoading: isPreviewLoading, error: previewError } = useVendorMergePreview(keepId, dropId);
    const mergeVendors = useMergeVendors();

    const canMerge = !!currentUser && MERGE_ALLOWED_USER_IDS.includes(currentUser.id);
    const sameSelection = keepId !== null && keepId === dropId;

    const handleMerge = () => {
        if (!keepId || !dropId || sameSelection) return;
        const keepName = preview?.keep.name ?? `#${keepId}`;
        const dropName = preview?.drop.name ?? `#${dropId}`;
        const confirmed = window.confirm(
            `Merge "${dropName}" (#${dropId}) into "${keepName}" (#${keepId})?\n\n` +
                "All references (tenders, RFQs, costing sheets, purchase orders, vendor work orders, contacts, GSTs, bank accounts and files) will be re-pointed to the keeper, " +
                `and "${dropName}" will be deactivated.\n\nThis cannot be undone from the UI.`,
        );
        if (!confirmed) return;

        mergeVendors.mutate(
            { keepId, dropId },
            { onSuccess: () => navigate(paths.master.vendors) },
        );
    };

    if (!canMerge) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Vendor merging is restricted to approved users.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const refSections: Array<{ label: string; key: keyof VendorMergePreview["references"] }> = [
        { label: "Tenders — RFQ To", key: "tendersRfqTo" },
        { label: "Tenders — OEM Not Allowed", key: "tendersOemNotAllowed" },
        { label: "RFQs — Requested Organization", key: "rfqsRequestedOrganization" },
        { label: "Costing Sheets — OEM Vendors", key: "costingSheetsOemVendorIds" },
        { label: "Purchase Orders — Seller", key: "purchaseOrders" },
        { label: "Vendor Work Orders — Seller", key: "vendorWorkOrders" },
        { label: "RFQ Responses", key: "rfqResponses" },
        { label: "Projects", key: "projects" },
    ];

    const totalMovingRefs = preview
        ? Object.values(preview.references).reduce((sum, group) => sum + group.count, 0)
        : 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Merge Vendors</CardTitle>
                            <CardDescription className="mt-2">
                                Combine a duplicate vendor into another. All relations are re-pointed to the keeper and the duplicate is deactivated (never deleted).
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => navigate(paths.master.vendors)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Keep (survivor)</div>
                        <VendorSelect
                            value={keepId}
                            onChange={setKeepId}
                            excludeId={dropId}
                            placeholder="Select the vendor to keep"
                        />
                    </div>

                    <div className="hidden md:flex md:items-center md:pt-7">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Merge into this one (duplicate)</div>
                        <VendorSelect
                            value={dropId}
                            onChange={setDropId}
                            excludeId={keepId}
                            placeholder="Select the duplicate vendor"
                        />
                    </div>

                    {sameSelection && (
                        <p className="text-sm text-destructive md:col-span-3">
                            Keep and merge-into must be different vendors.
                        </p>
                    )}
                </CardContent>
            </Card>

            {previewError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Error loading merge preview: {previewError.message}
                    </AlertDescription>
                </Alert>
            )}

            {isPreviewLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}

            {preview && !sameSelection && (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <OrgSummaryCard title="Keeper" org={preview.keep} />
                        <OrgSummaryCard title="Duplicate (will be deactivated)" org={preview.drop} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>References that will move</CardTitle>
                            <CardDescription>
                                {totalMovingRefs === 0
                                    ? "No external references point at the duplicate vendor."
                                    : `${totalMovingRefs} reference(s) will be re-pointed to "${preview.keep.name}".`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reference</TableHead>
                                        <TableHead className="w-[100px]">Count</TableHead>
                                        <TableHead>Row IDs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {refSections.map(({ label, key }) => {
                                        const group: VendorMergeRefGroup = preview.references[key];
                                        return (
                                            <TableRow key={key}>
                                                <TableCell className="font-medium">{label}</TableCell>
                                                <TableCell>
                                                    <Badge variant={group.count > 0 ? "default" : "secondary"}>
                                                        {group.count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="break-all text-sm text-muted-foreground">
                                                    {group.count === 0 ? "-" : group.ids.join(", ")}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            onClick={handleMerge}
                            disabled={mergeVendors.isPending || sameSelection || !keepId || !dropId}
                        >
                            {mergeVendors.isPending ? "Merging..." : `Merge into "${preview.keep.name}"`}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VendorMergePage;
