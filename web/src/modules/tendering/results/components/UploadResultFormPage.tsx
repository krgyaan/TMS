import { useEffect, useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUploadResult, useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { ArrowLeft, IndianRupee, Plus, Trash2, Save } from "lucide-react";
import { UploadResultSchema } from "../helpers/tenderResult.schema";

type FormValues = z.infer<typeof UploadResultSchema>;

interface DetailEntry {
    _key: string;
    result: string;
    resultReason: string;
    l1Price: string;
    l2Price: string;
    ourPrice: string;
    qualifiedPartiesScreenshot: string[];
    finalResultScreenshot: string[];
}

interface UploadResultFormPageProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        partiesCount: string;
        partiesNames: string[];
    };
    isEditMode?: boolean;
    onSuccess?: () => void;
}

const yesNoOptions = [
    { label: "No", value: "No" },
    { label: "Yes", value: "Yes" },
];

const resultOptions = [
    { label: "Won", value: "Won" },
    { label: "Lost", value: "Lost" },
    { label: "Cancelled", value: "Cancelled" },
];

export default function UploadResultFormPage({
    tenderId,
    tenderDetails,
    isEditMode = false,
    onSuccess,
}: UploadResultFormPageProps) {
    const navigate = useNavigate();
    const uploadResultMutation = useUploadResult();
    const { data: existingResult } = useTenderResultByTenderId(tenderId);

    const [technicallyQualified, setTechnicallyQualified] = useState<string>('Yes');
    const [disqualificationReason, setDisqualificationReason] = useState('');
    const [qualifiedPartiesCount, setQualifiedPartiesCount] = useState('');
    const [qualifiedPartiesNames, setQualifiedPartiesNames] = useState<string[]>([]);
    const [newPartyName, setNewPartyName] = useState('');

    const [details, setDetails] = useState<DetailEntry[]>(() => {
        if (isEditMode && existingResult?.details && existingResult.details.length > 0) {
            return existingResult.details.map((d: any, i: number) => ({
                _key: `existing-${d.id || i}`,
                result: d.result || '',
                resultReason: d.resultReason || '',
                l1Price: d.l1Price || '',
                l2Price: d.l2Price || '',
                ourPrice: d.ourPrice || '',
                qualifiedPartiesScreenshot: d.qualifiedPartiesScreenshot ? [d.qualifiedPartiesScreenshot] : [],
                finalResultScreenshot: d.finalResultScreenshot ? [d.finalResultScreenshot] : [],
            }));
        }
        return [];
    });

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (existingResult) {
            const tq = existingResult.technicallyQualified === 'Yes' || existingResult.technicallyQualified === 'No'
                ? existingResult.technicallyQualified : 'Yes';
            setTechnicallyQualified(tq);
            setDisqualificationReason(existingResult.disqualificationReason || '');
            setQualifiedPartiesCount(existingResult.qualifiedPartiesCount || '');
            setQualifiedPartiesNames(existingResult.qualifiedPartiesNames || []);

            if (isEditMode && existingResult.details && existingResult.details.length > 0) {
                setDetails(existingResult.details.map((d: any, i: number) => ({
                    _key: `existing-${d.id || i}`,
                    result: d.result || '',
                    resultReason: d.resultReason || '',
                    l1Price: d.l1Price || '',
                    l2Price: d.l2Price || '',
                    ourPrice: d.ourPrice || '',
                    qualifiedPartiesScreenshot: d.qualifiedPartiesScreenshot ? [d.qualifiedPartiesScreenshot] : [],
                    finalResultScreenshot: d.finalResultScreenshot ? [d.finalResultScreenshot] : [],
                })));
            }
        }
    }, [existingResult, isEditMode]);

    const addDetail = () => {
        setDetails(prev => [...prev, {
            _key: `new-${Date.now()}-${Math.random()}`,
            result: '',
            resultReason: '',
            l1Price: '',
            l2Price: '',
            ourPrice: '',
            qualifiedPartiesScreenshot: [],
            finalResultScreenshot: [],
        }]);
    };

    const updateDetail = (key: string, field: keyof DetailEntry, value: any) => {
        setDetails(prev => prev.map(d => d._key === key ? { ...d, [field]: value } : d));
    };

    const removeDetail = (key: string) => {
        setDetails(prev => prev.filter(d => d._key !== key));
    };

    const addPartyName = () => {
        if (newPartyName.trim()) {
            setQualifiedPartiesNames(prev => [...prev, newPartyName.trim()]);
            setNewPartyName('');
        }
    };

    const removePartyName = (index: number) => {
        setQualifiedPartiesNames(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async () => {
        setSubmitting(true);
        try {
            const submitData: any = {
                technicallyQualified,
            };

            if (technicallyQualified === 'No') {
                submitData.disqualificationReason = disqualificationReason;
            } else {
                submitData.qualifiedPartiesCount = qualifiedPartiesCount;
                submitData.qualifiedPartiesNames = qualifiedPartiesNames;

                if (details.length > 0) {
                    submitData.details = details.map(d => ({
                        result: d.result || undefined,
                        resultReason: d.resultReason || undefined,
                        l1Price: d.l1Price || undefined,
                        l2Price: d.l2Price || undefined,
                        ourPrice: d.ourPrice || undefined,
                        qualifiedPartiesScreenshot: d.qualifiedPartiesScreenshot[0] || undefined,
                        finalResultScreenshot: d.finalResultScreenshot[0] || undefined,
                    }));
                }
            }

            await uploadResultMutation.mutateAsync({
                tenderId,
                data: submitData,
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(paths.tendering.results);
            }
        } catch (error) {
            console.error('Error uploading result:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Tender Result</CardTitle>
                <CardDescription>
                    {tenderDetails.tenderNo} - {tenderDetails.tenderName}
                </CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.tendering.results)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        <SelectField
                            label="Technically Qualified"
                            options={yesNoOptions}
                            placeholder="Select qualification status"
                            value={technicallyQualified}
                            onChange={(v) => setTechnicallyQualified(v)}
                        />

                        {technicallyQualified === 'No' && (
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Reason for Disqualification</label>
                                <Textarea
                                    value={disqualificationReason}
                                    onChange={(e) => setDisqualificationReason(e.target.value)}
                                    placeholder="Enter reason for disqualification"
                                    rows={3}
                                />
                            </div>
                        )}

                        {technicallyQualified === 'Yes' && (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">No. of Qualified Parties</label>
                                    <Input
                                        value={qualifiedPartiesCount}
                                        onChange={(e) => setQualifiedPartiesCount(e.target.value)}
                                        placeholder="e.g., 5 or 'not known'"
                                    />
                                </div>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium mb-1 block">Name of Qualified Parties</label>
                                        <Input
                                            value={newPartyName}
                                            onChange={(e) => setNewPartyName(e.target.value)}
                                            placeholder="Enter party name"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); addPartyName(); }
                                            }}
                                        />
                                    </div>
                                    <Button type="button" onClick={addPartyName} size="icon">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {qualifiedPartiesNames.length > 0 && (
                                    <div className="flex flex-wrap gap-2 md:col-span-3">
                                        {qualifiedPartiesNames.map((name, index) => (
                                            <Badge key={index} variant="secondary" className="gap-1">
                                                {name}
                                                <button onClick={() => removePartyName(index)} className="ml-1">&times;</button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {technicallyQualified === 'Yes' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Line Item Results ({details.length})
                                </h4>
                                <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Line Item
                                </Button>
                            </div>

                            {details.map((detail) => (
                                <div key={detail._key} className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-950">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-semibold text-sm">Line Item</h5>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeDetail(detail._key)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <SelectField
                                            label="Result"
                                            options={resultOptions}
                                            placeholder="Select result"
                                            value={detail.result}
                                            onChange={(v) => updateDetail(detail._key, 'result', v)}
                                        />

                                        {detail.result !== 'Cancelled' && (
                                            <>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        value={detail.l1Price}
                                                        onChange={(e) => updateDetail(detail._key, 'l1Price', e.target.value)}
                                                        type="number"
                                                        step="0.01"
                                                        className="pl-10"
                                                        placeholder="L1 Price"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        value={detail.l2Price}
                                                        onChange={(e) => updateDetail(detail._key, 'l2Price', e.target.value)}
                                                        type="number"
                                                        step="0.01"
                                                        className="pl-10"
                                                        placeholder="L2 Price"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        value={detail.ourPrice}
                                                        onChange={(e) => updateDetail(detail._key, 'ourPrice', e.target.value)}
                                                        type="number"
                                                        step="0.01"
                                                        className="pl-10"
                                                        placeholder="Our Price"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className={detail.result !== 'Cancelled' ? 'md:col-span-3' : 'md:col-span-2'}>
                                            <Textarea
                                                value={detail.resultReason}
                                                onChange={(e) => updateDetail(detail._key, 'resultReason', e.target.value)}
                                                placeholder={detail.result === 'Cancelled' ? "Reason for cancellation" : "Reason for Win/Loss"}
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    {detail.result !== 'Cancelled' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <TenderFileUploader
                                                context="result-screenshots"
                                                value={detail.qualifiedPartiesScreenshot}
                                                onChange={(paths) => updateDetail(detail._key, 'qualifiedPartiesScreenshot', paths)}
                                                label="Screenshot of Qualified Parties"
                                                disabled={submitting}
                                            />
                                            <TenderFileUploader
                                                context="result-screenshots"
                                                value={detail.finalResultScreenshot}
                                                onChange={(paths) => updateDetail(detail._key, 'finalResultScreenshot', paths)}
                                                label="Final Result Screenshot"
                                                disabled={submitting}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(paths.tendering.results)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} disabled={submitting}>
                            <Save className="mr-2 h-4 w-4" />
                            Upload Result
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
