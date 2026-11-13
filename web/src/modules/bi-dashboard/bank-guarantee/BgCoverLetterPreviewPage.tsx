import { paths } from '@/app/routes/paths';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { paymentRequestsService } from '@/services/api/payment-requests.service';
import { ArrowLeft, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OVERRIDE_KEYS = [
    'cpName',
    'cpDesignation',
    'referenceNo',
    'purpose',
    'amount',
    'courierAddress',
] as const;

type OverrideKey = (typeof OVERRIDE_KEYS)[number];

const FIELD_LABELS: Record<OverrideKey, string> = {
    cpName: 'C&P Name',
    cpDesignation: 'C&P Designation',
    referenceNo: 'Tender No./Work Order No.',
    purpose: 'Purpose',
    amount: 'BG Amount',
    courierAddress: 'Courier Address',
};

export default function BgCoverLetterPreviewPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);

    const queryString = searchParams.toString();

    const overrides = useMemo(() => {
        const values: Record<string, string> = {};
        for (const key of OVERRIDE_KEYS) {
            const value = searchParams.get(key);
            if (value) values[key] = value;
        }
        return values;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    const [form, setForm] = useState<Record<OverrideKey, string>>(() => {
        const initial = {} as Record<OverrideKey, string>;
        for (const key of OVERRIDE_KEYS) {
            initial[key] = searchParams.get(key) ?? '';
        }
        return initial;
    });

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await paymentRequestsService.previewBgCoverLetterHtml(overrides);
                if (!cancelled) setHtml(result);
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.response?.data?.message || err?.message || 'Failed to load the cover letter preview.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString, reloadToken]);

    const applyOverrides = () => {
        const next = new URLSearchParams();
        for (const key of OVERRIDE_KEYS) {
            const value = form[key]?.trim();
            if (value) next.set(key, value);
        }
        setSearchParams(next);
    };

    const resetOverrides = () => {
        const empty = {} as Record<OverrideKey, string>;
        for (const key of OVERRIDE_KEYS) empty[key] = '';
        setForm(empty);
        setSearchParams(new URLSearchParams());
    };

    const openInNewTab = () => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const downloadPdf = async () => {
        setDownloading(true);
        setError('');
        try {
            const blob = await paymentRequestsService.previewBgCoverLetterPdf(overrides);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bg-cover-letter-preview.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to generate the PDF.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>BG Cover Letter Preview</CardTitle>
                            <CardDescription className="mt-2">
                                Renders the exact template that is attached to the BG create mail. No request is created.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => navigate(paths.bi.bankGuarantee)}>
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Back
                            </Button>
                            <Button variant="outline" onClick={() => setReloadToken((value) => value + 1)} disabled={loading}>
                                <RefreshCw className="mr-1 h-4 w-4" />
                                Reload
                            </Button>
                            <Button variant="outline" onClick={openInNewTab} disabled={!html}>
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Open
                            </Button>
                            <Button onClick={downloadPdf} disabled={downloading}>
                                {downloading ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-1 h-4 w-4" />
                                )}
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {OVERRIDE_KEYS.map((key) => (
                            <div key={key} className="flex flex-col gap-1">
                                <Label htmlFor={`preview-${key}`} className="text-xs text-muted-foreground">
                                    {FIELD_LABELS[key]}
                                </Label>
                                <Input
                                    id={`preview-${key}`}
                                    value={form[key]}
                                    placeholder="Sample value"
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, [key]: event.target.value }))
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') applyOverrides();
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Button size="sm" onClick={applyOverrides}>
                            Apply
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetOverrides}>
                            Reset to sample
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Blank fields fall back to the built-in sample values.
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    {error ? (
                        <div className="p-6 text-sm text-destructive">{error}</div>
                    ) : loading ? (
                        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rendering preview…
                        </div>
                    ) : (
                        <div className="flex justify-center bg-muted/40 p-4">
                            <iframe
                                title="BG Cover Letter Preview"
                                srcDoc={html}
                                className="w-full max-w-[794px] rounded-lg border border-border bg-white shadow-sm"
                                style={{ height: '1123px' }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
