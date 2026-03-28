import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, FileText, Calendar, ExternalLink, Download, Banknote, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import type { BankContactResponse, DueEmiResponse, LoanAdvanceFullDetails, TdsRecoveryResponse } from '../helpers/loanAdvance.types';
import { formatINR } from '@/hooks/useINRFormatter';
import { tenderFilesService } from '@/services/api/tender-files.service';

// Helper component for displaying label-value pairs
interface DetailItemProps {
    label: string;
    value: React.ReactNode;
    className?: string;
}

interface LoanAdvanceViewProps {
    loanAdvance: LoanAdvanceFullDetails;
}

const DetailItem = ({ label, value, className = '' }: DetailItemProps) => (
    <div className={`space-y-1 ${className}`}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value || '—'}</p>
    </div>
);

// Helper component for Yes/No badges
const YesNoBadge = ({ value }: { value: string }) => {
    const isYes = value?.toLowerCase() === 'yes';
    return (
        <Badge variant={isYes ? 'default' : 'secondary'} className="gap-1">
            {isYes ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {value}
        </Badge>
    );
};

// Helper to render file download buttons for array of files
const FileDownloadButtons = ({
    files,
    label
}: {
    files: string[] | null;
    label: string;
}) => {
    if (!files || files.length === 0) {
        return <span className="text-sm text-muted-foreground">Not uploaded</span>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
                <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    asChild
                >
                    <a
                        href={tenderFilesService.getFileUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Download className="h-4 w-4 mr-1" />
                        {files.length > 1 ? `${label} ${index + 1}` : label}
                    </a>
                </Button>
            ))}
        </div>
    );
};

const LoanAdvanceView = ({ loanAdvance }: LoanAdvanceViewProps) => {
    const navigate = useNavigate();

    // Safely access arrays with fallback
    const bankContacts = loanAdvance.bankContacts ?? [];
    const loanDueEmis = loanAdvance.loanDueEmis ?? [];
    const loanTdsRecoveries = loanAdvance.loanTdsRecoveries ?? [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="h-6 w-6" />
                            Loan & Advance Details
                        </CardTitle>
                        <CardDescription className="mt-2">
                            View complete loan information and status
                        </CardDescription>
                    </div>
                    <CardAction className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent className="space-y-8">
                {/* Status Banner */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge
                                variant={loanAdvance.loanCloseStatus === 'Active' ? 'default' : 'secondary'}
                                className="text-sm"
                            >
                                {loanAdvance.loanCloseStatus || 'Active'}
                            </Badge>
                        </div>
                        {loanAdvance.isDue && (
                            <Badge variant="destructive" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Payment Due
                            </Badge>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Loan ID: <span className="font-mono font-semibold">#{loanAdvance.id}</span>
                    </div>
                </div>

                {/* Basic Loan Information */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Loan Information</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Loan Party Name"
                            value={loanAdvance.loanPartyName}
                        />
                        <DetailItem
                            label="Bank/NBFC Name"
                            value={loanAdvance.bankName}
                        />
                        <DetailItem
                            label="Type of Loan"
                            value={
                                <Badge variant="outline">{loanAdvance.typeOfLoan}</Badge>
                            }
                        />
                        <DetailItem
                            label="Loan Account No."
                            value={
                                <span className="font-mono">{loanAdvance.loanAccNo}</span>
                            }
                        />
                    </div>
                </div>

                <Separator />

                {/* Financial Information */}
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Loan Amount"
                            value={
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatINR(Number(loanAdvance.loanAmount))}
                                </span>
                            }
                        />
                        <DetailItem
                            label="Principal Outstanding"
                            value={
                                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {formatINR(Number(loanAdvance.principleOutstanding ?? 0))}
                                </span>
                            }
                        />
                        <DetailItem
                            label="Total Interest Paid"
                            value={
                                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                    {formatINR(Number(loanAdvance.totalInterestPaid ?? 0))}
                                </span>
                            }
                        />
                        <DetailItem
                            label="EMIs Paid"
                            value={
                                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    {loanAdvance.noOfEmisPaid ?? 0}
                                </span>
                            }
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-4">
                        <DetailItem
                            label="Total Penal Charges Paid"
                            value={formatINR(Number(loanAdvance.totalPenalChargesPaid ?? 0))}
                        />
                        <DetailItem
                            label="Total TDS to Recover"
                            value={formatINR(Number(loanAdvance.totalTdsToRecover ?? 0))}
                        />
                    </div>
                </div>

                <Separator />

                {/* Important Dates */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Important Dates</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Sanction Letter Date"
                            value={loanAdvance.sanctionLetterDate ? formatDate(loanAdvance.sanctionLetterDate) : '—'}
                        />
                        <DetailItem
                            label="EMI Payment Date"
                            value={loanAdvance.emiPaymentDate ? formatDate(loanAdvance.emiPaymentDate) : '—'}
                        />
                        <DetailItem
                            label="Last EMI Date"
                            value={loanAdvance.lastEmiDate ? formatDate(loanAdvance.lastEmiDate) : '—'}
                        />
                        <DetailItem
                            label="Created On"
                            value={loanAdvance.createdAt ? formatDateTime(loanAdvance.createdAt) : '—'}
                        />
                    </div>
                </div>

                <Separator />

                {/* Documents Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Documents</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Sanction Letter */}
                        <div>
                            <p className="text-sm font-medium mb-2">Sanction Letter</p>
                            <FileDownloadButtons
                                files={loanAdvance.sanctionLetter}
                                label="Download"
                            />
                        </div>

                        {/* Bank Loan Schedule */}
                        <div>
                            <p className="text-sm font-medium mb-2">Bank Loan Schedule</p>
                            <FileDownloadButtons
                                files={loanAdvance.bankLoanSchedule}
                                label="Download"
                            />
                        </div>

                        {/* Loan Schedule (Google Sheet) */}
                        <div>
                            <p className="text-sm font-medium mb-2">Loan Schedule (Sheet)</p>
                            {loanAdvance.loanSchedule ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                >
                                    <a
                                        href={loanAdvance.loanSchedule}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        Open Sheet
                                    </a>
                                </Button>
                            ) : (
                                <span className="text-sm text-muted-foreground">Not provided</span>
                            )}
                        </div>

                        {/* Bank NOC Document (if showNocUpload is true) */}
                        {loanAdvance.showNocUpload && (
                            <div>
                                <p className="text-sm font-medium mb-2">Bank NOC Document</p>
                                {loanAdvance.bankNocDocument && loanAdvance.bankNocDocument.length > 0 ? (
                                    <FileDownloadButtons
                                        files={loanAdvance.bankNocDocument}
                                        label="Download"
                                    />
                                ) : (
                                    <span className="text-sm text-yellow-600">Pending Upload</span>
                                )}
                            </div>
                        )}

                        {/* Closure MCA Document (if loan is closed) */}
                        {loanAdvance.loanCloseStatus === 'Closed' && loanAdvance.closureCreatedMca && (
                            <div>
                                <p className="text-sm font-medium mb-2">Closure MCA Document</p>
                                <FileDownloadButtons
                                    files={loanAdvance.closureCreatedMca}
                                    label="Download"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Additional Options */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Additional Information</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Charge Created on MCA Website"
                            value={<YesNoBadge value={loanAdvance.chargeMcaWebsite} />}
                        />
                        <DetailItem
                            label="TDS to be Deducted on Interest"
                            value={<YesNoBadge value={loanAdvance.tdsToBeDeductedOnInterest} />}
                        />
                        <DetailItem
                            label="Show NOC Upload"
                            value={loanAdvance.showNocUpload ? 'Yes' : 'No'}
                        />
                        <DetailItem
                            label="Last Updated"
                            value={loanAdvance.updatedAt ? formatDateTime(loanAdvance.updatedAt) : '—'}
                        />
                    </div>
                </div>

                <Separator />

                {/* Bank Contacts */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">
                            Bank/NBFC Contacts
                            {bankContacts.length > 0 && (
                                <Badge variant="outline" className="ml-2">{bankContacts.length}</Badge>
                            )}
                        </h3>
                    </div>

                    {bankContacts.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Person Name</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bankContacts.map((contact: BankContactResponse) => (
                                        <TableRow key={contact.id}>
                                            <TableCell>{contact.orgName || '—'}</TableCell>
                                            <TableCell>{contact.personName || '—'}</TableCell>
                                            <TableCell>{contact.designation || '—'}</TableCell>
                                            <TableCell>
                                                {contact.phone ? (
                                                    <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                                                        {contact.phone}
                                                    </a>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {contact.email ? (
                                                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                                        {contact.email}
                                                    </a>
                                                ) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No contacts added</p>
                    )}
                </div>

                <Separator />

                {/* Due EMIs */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">
                            EMI Payment History
                            {loanDueEmis.length > 0 && (
                                <Badge variant="outline" className="ml-2">{loanDueEmis.length}</Badge>
                            )}
                        </h3>
                    </div>

                    {loanDueEmis.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>EMI Date</TableHead>
                                        <TableHead className="text-right">Principal Paid</TableHead>
                                        <TableHead className="text-right">Interest Paid</TableHead>
                                        <TableHead className="text-right">TDS to Recover</TableHead>
                                        <TableHead className="text-right">Penal Charges</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loanDueEmis.map((emi: DueEmiResponse) => (
                                        <TableRow key={emi.id}>
                                            <TableCell>{emi.emiDate ? formatDate(emi.emiDate) : '—'}</TableCell>
                                            <TableCell className="text-right">{formatINR(Number(emi.principlePaid ?? 0))}</TableCell>
                                            <TableCell className="text-right">{formatINR(Number(emi.interestPaid ?? 0))}</TableCell>
                                            <TableCell className="text-right">{formatINR(Number(emi.tdsToBeRecovered ?? 0))}</TableCell>
                                            <TableCell className="text-right">{formatINR(Number(emi.penalChargesPaid ?? 0))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No EMI payments recorded</p>
                    )}
                </div>

                <Separator />

                {/* TDS Recoveries */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">
                            TDS Recoveries
                            {loanTdsRecoveries.length > 0 && (
                                <Badge variant="outline" className="ml-2">{loanTdsRecoveries.length}</Badge>
                            )}
                        </h3>
                    </div>

                    {loanTdsRecoveries.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>TDS Date</TableHead>
                                        <TableHead className="text-right">TDS Amount</TableHead>
                                        <TableHead>Bank Details</TableHead>
                                        <TableHead>Document</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loanTdsRecoveries.map((recovery: TdsRecoveryResponse) => (
                                        <TableRow key={recovery.id}>
                                            <TableCell>{recovery.tdsDate ? formatDate(recovery.tdsDate) : '—'}</TableCell>
                                            <TableCell className="text-right">{formatINR(Number(recovery.tdsAmount ?? 0))}</TableCell>
                                            <TableCell>{recovery.tdsRecoveryBankDetails || '—'}</TableCell>
                                            <TableCell>
                                                {recovery.tdsDocument && recovery.tdsDocument.length > 0 ? (
                                                    <div className="flex gap-1">
                                                        {recovery.tdsDocument.map((doc, idx) => (
                                                            <Button key={idx} variant="ghost" size="sm" asChild>
                                                                <a
                                                                    href={tenderFilesService.getFileUrl(doc)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No TDS recoveries recorded</p>
                    )}
                </div>

                {/* Action Buttons at Bottom */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={() => navigate(paths.accounts.loanAdvances)}
                    >
                        Back to List
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default LoanAdvanceView;
