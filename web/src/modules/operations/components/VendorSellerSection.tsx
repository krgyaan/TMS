import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AsyncSelectField, type AsyncSelectOption } from "@/components/form/AsyncSelectField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Mail, MapPin, Phone, UserPlus } from "lucide-react";
import { useSellerContactPerson } from "@/hooks/useSellerContactPerson";
import { useSellerGstSelection } from "@/hooks/useSellerGstSelection";
import { formatVendorName } from "@/lib/vendorName";
import type { SellerOption } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";

type SellerFormValues = {
    sellerId: string;
    sellerGstId: string;
    sellerName: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerGstNo: string;
    sellerPanNo: string;
    sellerMsmeNo: string;
    sellerCinNo: string;
    vendorPersonId: string;
    vendorContactPersonName: string;
    vendorContactPersonPhone: string;
    vendorContactPersonEmail: string;
};

type VendorSellerSectionProps<T extends SellerFormValues> = {
    form: UseFormReturn<T>;
    mode: "po" | "vwo";
    sellerOptions: AsyncSelectOption[];
    sellerRows: SellerOption[];
    onSellerSearch: (query: string) => void;
    isSellerLoading: boolean;
    onAddSeller: () => void;
    addSellerDialog: ReactNode;
    isCreatingSeller?: boolean;
    autoSelectFirst?: boolean;
};

export function VendorSellerSection<T extends SellerFormValues>({
    form,
    mode,
    sellerOptions,
    sellerRows,
    onSellerSearch,
    isSellerLoading,
    onAddSeller,
    addSellerDialog,
    isCreatingSeller,
    autoSelectFirst = true,
}: VendorSellerSectionProps<T>) {
    const isVendor = mode === "vwo";
    const selectedSellerId = form.watch("sellerId" as never) as unknown as string | undefined;
    const selectedSellerGstId = form.watch("sellerGstId" as never) as unknown as string | undefined;

    const { sellerGsts, isLoading: isSellerGstsLoading } = useSellerGstSelection(form, { autoSelectFirst });
    const { sellerPersons } = useSellerContactPerson(form, { autoSelectFirstOnLoad: autoSelectFirst });

    const sellerGstOptions = useMemo(
        () =>
            sellerGsts.map(g => ({
                id: String(g.id),
                name: g.gstNo || "No GSTIN",
                description: [g.gstState, g.address].filter(Boolean).join(" - ") || undefined,
            })),
        [sellerGsts],
    );

    const sellerPersonOptions = useMemo(
        () => sellerPersons.map(p => ({ id: String(p.id), name: p.name || "Unnamed person" })),
        [sellerPersons],
    );

    // Org selection fills the organisation-owned fields. The GST selection owns
    // the address and GST number, so those are never written here.
    useEffect(() => {
        if (!selectedSellerId || selectedSellerId === "__create_new__") return;
        const party = sellerRows.find(p => String(p.id) === selectedSellerId);
        if (!party) return;
        form.setValue("sellerName" as never, formatVendorName(party.name || "") as never);
        form.setValue("sellerPanNo" as never, (party.pan || "") as never);
        form.setValue("sellerMsmeNo" as never, (party.msme || "") as never);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSellerId, sellerRows]);

    const hasGstRows = sellerGsts.length > 0;
    const personDisabled = !selectedSellerGstId && hasGstRows;

    return (
        <div className="border rounded-lg border-primary border-dashed p-2 my-3 w-full md:w-1/2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {isVendor ? "Vendor Information" : "Seller Information"}
                </h3>
                <Button variant="outline" size="sm" type="button" onClick={onAddSeller} disabled={isCreatingSeller}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isVendor ? "Add New Vendor" : "Add New Seller"}
                </Button>
            </div>
            {addSellerDialog}

            <div className="space-y-4">
                <section className="rounded-md border bg-muted/20 p-3">
                    <h4 className="text-sm font-semibold mb-3">1. Vendor Organisation Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="md:col-span-2">
                            <AsyncSelectField
                                control={form.control}
                                name={"sellerId" as never}
                                label={isVendor ? "Select Existing Vendor" : "Select Existing Seller"}
                                options={sellerOptions}
                                placeholder={isVendor ? "Choose a vendor..." : "Choose a seller..."}
                                onSearch={onSellerSearch}
                                isLoading={isSellerLoading}
                            />
                        </div>
                        <FieldWrapper
                            control={form.control}
                            name={"sellerName" as never}
                            label={
                                <>
                                    {isVendor ? "Vendor Name" : "Seller Name"} <span className="text-destructive">*</span>
                                </>
                            }
                        >
                            {field => (
                                <Input
                                    {...field}
                                    placeholder={isVendor ? "Enter vendor name" : "Enter seller name"}
                                    onBlur={() => {
                                        field.onChange(formatVendorName(field.value));
                                        field.onBlur();
                                    }}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name={"sellerMsmeNo" as never} label="MSME Number">
                            {field => (
                                <Input
                                    {...field}
                                    placeholder="e.g. UDYAM-XX-00-0000000"
                                    className="font-mono"
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper
                            control={form.control}
                            name={"sellerCinNo" as never}
                            label={
                                <>
                                    <Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                    CIN Number
                                </>
                            }
                        >
                            {field => (
                                <Input
                                    {...field}
                                    placeholder="e.g. U74999KA2020PTC123456"
                                    className="font-mono"
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            )}
                        </FieldWrapper>
                    </div>
                </section>

                <section className="rounded-md border bg-muted/20 p-3">
                    <h4 className="text-sm font-semibold mb-3">2. GST, PAN &amp; Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="md:col-span-2">
                            <SelectField
                                control={form.control}
                                name={"sellerGstId" as never}
                                label="Select GST Registration"
                                options={sellerGstOptions}
                                placeholder={
                                    !selectedSellerId
                                        ? "Select a vendor first"
                                        : isSellerGstsLoading
                                          ? "Loading GSTs..."
                                          : sellerGsts.length === 0
                                            ? "No GSTs saved for this vendor"
                                            : "Select a GST..."
                                }
                                disabled={!selectedSellerId || sellerGsts.length === 0}
                                valueType="string"
                                descriptionPlacement="below"
                            />
                        </div>
                        <FieldWrapper control={form.control} name={"sellerGstNo" as never} label="GST Number">
                            {field => (
                                <Input
                                    {...field}
                                    placeholder="e.g. 27ABCDE1234F1Z5"
                                    className="font-mono"
                                    maxLength={15}
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name={"sellerPanNo" as never} label="PAN Number">
                            {field => (
                                <Input
                                    {...field}
                                    placeholder="e.g. ABCDE1234F"
                                    className="font-mono"
                                    maxLength={10}
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            )}
                        </FieldWrapper>
                        <div className="md:col-span-2">
                            <FieldWrapper
                                control={form.control}
                                name={"sellerAddress" as never}
                                label={
                                    <>
                                        <MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                        GST Address
                                    </>
                                }
                            >
                                {field => <Textarea {...field} placeholder="Address for the selected GST registration" rows={2} />}
                            </FieldWrapper>
                        </div>
                    </div>
                </section>

                <section className="rounded-md border bg-muted/20 p-3">
                    <h4 className="text-sm font-semibold mb-3">3. Contact Person Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="md:col-span-2">
                            <SelectField
                                control={form.control}
                                name={"vendorPersonId" as never}
                                label="Select Contact Person"
                                options={sellerPersonOptions}
                                placeholder={
                                    !selectedSellerId
                                        ? "Select a vendor first"
                                        : personDisabled
                                          ? "Select a GST first"
                                          : sellerPersons.length
                                            ? "Select vendor contact person..."
                                            : "No persons saved for this vendor"
                                }
                                disabled={!selectedSellerId || personDisabled || sellerPersons.length === 0}
                            />
                        </div>
                        <FieldWrapper control={form.control} name={"vendorContactPersonName" as never} label="Contact Name">
                            {field => <Input {...field} placeholder="Enter contact name" />}
                        </FieldWrapper>
                        <FieldWrapper
                            control={form.control}
                            name={"vendorContactPersonPhone" as never}
                            label={
                                <>
                                    <Phone className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                    Phone
                                </>
                            }
                        >
                            {field => <Input {...field} placeholder="e.g. +91-9876543210" />}
                        </FieldWrapper>
                        <div className="md:col-span-2">
                            <FieldWrapper
                                control={form.control}
                                name={"vendorContactPersonEmail" as never}
                                label={
                                    <>
                                        <Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                        Email
                                    </>
                                }
                            >
                                {field => <Input {...field} type="email" placeholder="contact@example.com" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
