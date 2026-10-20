import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fileUploadService } from "@/services/api/file-upload.service";
import type { Vendor, VendorAcc, VendorFile, VendorGst } from "@/types/api.types";

export type VendorRelationTab = "gsts" | "accounts" | "persons" | "files";

export type VendorRelationTablesProps = {
    gsts: VendorGst[];
    accounts: VendorAcc[];
    persons: Vendor[];
    files: VendorFile[];
    activeTab: VendorRelationTab;
    onTabChange: (tab: VendorRelationTab) => void;
    /** Rendered in the GST tab header (e.g. "Add GST"). */
    gstHeaderAction?: ReactNode;
    /** Rendered as an Actions column per GST row. */
    gstRowActions?: (gst: VendorGst) => ReactNode;
    accountHeaderAction?: ReactNode;
    accountRowActions?: (account: VendorAcc) => ReactNode;
    personHeaderAction?: ReactNode;
    personRowActions?: (person: Vendor) => ReactNode;
    filesHeaderAction?: ReactNode;
    fileRowActions?: (file: VendorFile) => ReactNode;
};

const StatusBadge = ({ status }: { status?: boolean | null }) =>
    status === false ? (
        <Badge variant="secondary">Inactive</Badge>
    ) : (
        <Badge variant="default">Active</Badge>
    );

const EmptyRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
        <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
            No records found.
        </TableCell>
    </TableRow>
);

const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) =>
    action ? (
        <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">{title}</div>
            {action}
        </div>
    ) : null;

export const VendorRelationTables = ({
    gsts,
    accounts,
    persons,
    files,
    activeTab,
    onTabChange,
    gstHeaderAction,
    gstRowActions,
    accountHeaderAction,
    accountRowActions,
    personHeaderAction,
    personRowActions,
    filesHeaderAction,
    fileRowActions,
}: VendorRelationTablesProps) => {
    const gstCols = 4 + (gstRowActions ? 1 : 0);
    const accountCols = 4 + (accountRowActions ? 1 : 0);
    const personCols = 4 + (personRowActions ? 1 : 0);

    return (
        <Tabs value={activeTab} onValueChange={value => onTabChange(value as VendorRelationTab)} className="w-full">
            <TabsList>
                <TabsTrigger value="gsts">GST Numbers ({gsts.length})</TabsTrigger>
                <TabsTrigger value="accounts">Bank Accounts ({accounts.length})</TabsTrigger>
                <TabsTrigger value="persons">Persons ({persons.length})</TabsTrigger>
                <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="gsts" className="mt-4">
                <SectionHeader title="GST numbers registered for this vendor." action={gstHeaderAction} />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>GST State</TableHead>
                            <TableHead>GST Number</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Status</TableHead>
                            {gstRowActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gsts.length === 0 ? (
                            <EmptyRow colSpan={gstCols} />
                        ) : (
                            gsts.map(gst => (
                                <TableRow key={gst.id}>
                                    <TableCell>{gst.gstState || "-"}</TableCell>
                                    <TableCell className="break-all">{gst.gstNo || "-"}</TableCell>
                                    <TableCell className="break-words">{gst.address || "-"}</TableCell>
                                    <TableCell><StatusBadge status={gst.status} /></TableCell>
                                    {gstRowActions && <TableCell className="text-right">{gstRowActions(gst)}</TableCell>}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            <TabsContent value="accounts" className="mt-4">
                <SectionHeader title="Bank accounts for this vendor." action={accountHeaderAction} />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Account Number</TableHead>
                            <TableHead>IFSC</TableHead>
                            <TableHead>Status</TableHead>
                            {accountRowActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.length === 0 ? (
                            <EmptyRow colSpan={accountCols} />
                        ) : (
                            accounts.map(account => (
                                <TableRow key={account.id}>
                                    <TableCell>{account.bankAccountName || "-"}</TableCell>
                                    <TableCell className="break-all">{account.accountNum || "-"}</TableCell>
                                    <TableCell className="break-all">{account.ifscCode || "-"}</TableCell>
                                    <TableCell><StatusBadge status={account.status} /></TableCell>
                                    {accountRowActions && (
                                        <TableCell className="text-right">{accountRowActions(account)}</TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            <TabsContent value="persons" className="mt-4">
                <SectionHeader title="Contact persons for this vendor." action={personHeaderAction} />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Address</TableHead>
                            {personRowActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {persons.length === 0 ? (
                            <EmptyRow colSpan={personCols} />
                        ) : (
                            persons.map(person => (
                                <TableRow key={person.id}>
                                    <TableCell>{person.name || "-"}</TableCell>
                                    <TableCell className="break-all">{person.email || "-"}</TableCell>
                                    <TableCell className="break-all">{person.mobile || "-"}</TableCell>
                                    <TableCell className="break-words">{person.address || "-"}</TableCell>
                                    {personRowActions && (
                                        <TableCell className="text-right">{personRowActions(person)}</TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
                <SectionHeader title="Uploaded vendor documents." action={filesHeaderAction} />
                {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <p className="text-sm">No files uploaded yet.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>File</TableHead>
                                {fileRowActions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map(file => (
                                <TableRow key={file.id}>
                                    <TableCell>{file.name || "-"}</TableCell>
                                    <TableCell>
                                        <a
                                            href={fileUploadService.getFileUrl(file.filePath)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 underline break-all"
                                        >
                                            {file.filePath}
                                        </a>
                                    </TableCell>
                                    {fileRowActions && (
                                        <TableCell className="text-right">{fileRowActions(file)}</TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TabsContent>
        </Tabs>
    );
};
