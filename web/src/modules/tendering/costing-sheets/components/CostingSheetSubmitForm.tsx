import { paths } from '@/app/routes/paths';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitCostingSheet, useUpdateCostingSheet } from '@/hooks/api/useCostingSheets';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { AlertCircle, ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TenderCostingDetail, TenderCostingSheet } from '../helpers/costingSheet.types';

interface CostingSheetSubmitFormProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'submit' | 'edit' | 'resubmit';
    existingData?: TenderCostingSheet;
    isChecklistFulfilled?: boolean;
    isItemWise?: boolean;
}

interface DetailEntry {
    _key: string;
    submittedFinalPrice: string;
    submittedReceiptPrice: string;
    submittedBudgetPrice: string;
    teRemarks: string;
    id?: number;
    status?: string;
    submittedGrossMargin?: string;
    rejectionReason?: string | null;
}

function calcMargin(receipt: string, budget: string): string {
    const r = parseFloat(receipt) || 0;
    const b = parseFloat(budget) || 0;
    return r > 0 ? ((r - b) / r * 100).toFixed(2) : '0.00';
}

export default function CostingSheetSubmitForm({
    tenderId,
    tenderDetails,
    mode,
    existingData,
    isChecklistFulfilled = true,
    isItemWise = false,
}: CostingSheetSubmitFormProps) {
    const navigate = useNavigate();
    const submitMutation = useSubmitCostingSheet();
    const updateMutation = useUpdateCostingSheet();

    const existingDetails: TenderCostingDetail[] = (existingData as any)?.details || [];

    const [details, setDetails] = useState<DetailEntry[]>(() => {
        if (existingDetails.length > 0) {
            return existingDetails.map(d => ({
                _key: `existing-${d.id}`,
                id: d.id,
                status: d.status,
                submittedFinalPrice: d.submittedFinalPrice || '',
                submittedReceiptPrice: d.submittedReceiptPrice || '',
                submittedBudgetPrice: d.submittedBudgetPrice || '',
                submittedGrossMargin: d.submittedGrossMargin || '0.00',
                teRemarks: d.teRemarks || '',
                rejectionReason: d.rejectionReason,
            }));
        }
        return [{
            _key: 'new-1',
            submittedFinalPrice: '',
            submittedReceiptPrice: '',
            submittedBudgetPrice: '',
            teRemarks: '',
        }];
    });

    const [submitting, setSubmitting] = useState(false);

    const addDetail = () => {
        setDetails(prev => [...prev, {
            _key: `new-${Date.now()}-${Math.random()}`,
            submittedFinalPrice: '',
            submittedReceiptPrice: '',
            submittedBudgetPrice: '',
            teRemarks: '',
        }]);
    };

    const updateDetail = (key: string, field: keyof DetailEntry, value: string) => {
        setDetails(prev => prev.map(d => d._key === key ? { ...d, [field]: value } : d));
    };

    const removeDetail = (key: string) => {
        setDetails(prev => prev.filter(d => d._key !== key));
    };

    const resetDetails = () => {
        setDetails([{
            _key: 'new-1',
            submittedFinalPrice: '',
            submittedReceiptPrice: '',
            submittedBudgetPrice: '',
            teRemarks: '',
        }]);
    };

    const canRemove = (d: DetailEntry) => !d.id || d.status === 'Pending' || d.status === 'Rejected/Redo' || d.status === 'Created';

    const onSubmit = async () => {
        const validDetails = details.filter(d => d.submittedFinalPrice && d.submittedReceiptPrice && d.submittedBudgetPrice && d.teRemarks);
        if (validDetails.length === 0) return;

        setSubmitting(true);
        try {
            const payload = {
                tenderId,
                details: validDetails.map(d => ({
                    submittedFinalPrice: d.submittedFinalPrice,
                    submittedReceiptPrice: d.submittedReceiptPrice,
                    submittedBudgetPrice: d.submittedBudgetPrice,
                    submittedGrossMargin: calcMargin(d.submittedReceiptPrice, d.submittedBudgetPrice),
                    teRemarks: d.teRemarks,
                })),
            };

            if (existingData?.id) {
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            } else {
                await submitMutation.mutateAsync(payload);
            }
            navigate(paths.tendering.costingSheets);
        } catch (error) {
            console.error('Error submitting costing sheet:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getTitle = () => {
        if (mode === 'submit') return 'Submit Costing Sheet';
        if (mode === 'edit') return 'Edit Costing Sheet';
        return 'Re-submit Costing Sheet';
    };

    const getDescription = () => {
        if (isItemWise) {
            if (mode === 'submit') return 'Add one or more costing options for item-wise evaluation';
            if (mode === 'edit') return 'Update costing details';
            return 'Re-submit after addressing rejection feedback';
        }
        if (mode === 'submit') return 'Submit costing details for this tender';
        if (mode === 'edit') return 'Update costing sheet information';
        return 'Re-submit after addressing rejection feedback';
    };

    const isSaveDisabled = submitting || !isChecklistFulfilled || details.every(d => !d.submittedFinalPrice);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{getTitle()}</CardTitle>
                        <CardDescription className="mt-2">{getDescription()}</CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Rejection alert */}
                {mode === 'resubmit' && existingData?.rejectionReason && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription><strong>Rejection Reason:</strong> {existingData.rejectionReason}</AlertDescription>
                    </Alert>
                )}

                {/* Tender Info */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                        <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                        <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                        <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                        <p className="text-base font-semibold">{tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}</p>
                    </div>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base text-primary">Costing Details ({details.length})</h4>
                        {isItemWise && (
                            <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                                <Plus className="h-4 w-4 mr-1" /> Add Detail
                            </Button>
                        )}
                    </div>

                    {details.map((d, idx) => (
                        <Card key={d._key} className="border-l-4 border-l-primary">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">Detail #{idx + 1}</span>
                                    <div className="flex items-center gap-2">
                                        {d.status && (
                                            <Badge variant={
                                                d.status === 'Approved' ? 'default' :
                                                d.status === 'Submitted' ? 'secondary' :
                                                d.status === 'Rejected/Redo' ? 'destructive' : 'outline'
                                            }>{d.status}</Badge>
                                        )}
                                        {isItemWise && canRemove(d) && (
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDetail(d._key)}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="py-2">
                                {d.rejectionReason && (
                                    <Alert variant="destructive" className="mb-3 py-2">
                                        <AlertCircle className="h-3 w-3" />
                                        <AlertDescription className="text-xs">{d.rejectionReason}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Final Price (GST Inclusive)</label>
                                        <Input
                                            type="number" step="0.01"
                                            placeholder="Enter final price"
                                            value={d.submittedFinalPrice}
                                            onChange={e => updateDetail(d._key, 'submittedFinalPrice', e.target.value)}
                                            disabled={d.status === 'Approved' || d.status === 'Submitted'}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Receipt (Pre GST)</label>
                                        <Input
                                            type="number" step="0.01"
                                            placeholder="Enter receipt price"
                                            value={d.submittedReceiptPrice}
                                            onChange={e => updateDetail(d._key, 'submittedReceiptPrice', e.target.value)}
                                            disabled={d.status === 'Approved' || d.status === 'Submitted'}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Budget (Pre GST)</label>
                                        <Input
                                            type="number" step="0.01"
                                            placeholder="Enter budget price"
                                            value={d.submittedBudgetPrice}
                                            onChange={e => updateDetail(d._key, 'submittedBudgetPrice', e.target.value)}
                                            disabled={d.status === 'Approved' || d.status === 'Submitted'}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Gross Margin %</label>
                                        <Input type="text" readOnly value={calcMargin(d.submittedReceiptPrice, d.submittedBudgetPrice)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                                        <Textarea
                                            rows={2} className="mt-1 text-sm"
                                            placeholder="Enter remarks"
                                            value={d.teRemarks}
                                            onChange={e => updateDetail(d._key, 'teRemarks', e.target.value)}
                                            disabled={d.status === 'Approved' || d.status === 'Submitted'}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Checklist warning */}
                {!isChecklistFulfilled && (
                    <p className="text-[10px] text-red-500 font-medium text-right italic">
                        * Complete all checkpoints to enable submission
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
                        Cancel
                    </Button>
                    {!isItemWise && (
                        <Button type="button" variant="ghost" onClick={resetDetails} disabled={submitting}>
                            Reset
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSaveDisabled}
                        className={!isChecklistFulfilled ? "cursor-not-allowed opacity-50" : ""}
                        title={!isChecklistFulfilled ? "Please complete all mandatory checkpoints first" : ""}
                    >
                        {submitting && <span className="animate-spin mr-2">⏳</span>}
                        <Save className="mr-2 h-4 w-4" />
                        {mode === 'submit' ? 'Submit' : mode === 'edit' ? 'Update' : 'Resubmit'} Costing {isItemWise ? 'Details' : 'Sheet'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
