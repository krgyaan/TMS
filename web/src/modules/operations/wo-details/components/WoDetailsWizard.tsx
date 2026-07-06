import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { WIZARD_CONFIG } from "../helpers/constants";
import { apiToForm, formToApi } from "../helpers/woDetail.mapper";
import { WizardStepper } from "./WizardStepper";

import { useWoBasicDetailById } from "@/hooks/api/useWoBasicDetails";
import { useInitializeWizard, useSavePageDraft, useSkipPage, useSubmitAllPages, useSubmitPage, useWoDetailByBasicDetail } from "@/hooks/api/useWoDetails";
import type { WizardState, WoDetailData } from "../helpers/woDetail.types";

const Page1Handover = lazy(() => import("./pages/Page1Handover").then((m) => ({ default: m.Page1Handover })));
const Page2Compliance = lazy(() => import("./pages/Page2Compliance").then((m) => ({ default: m.Page2Compliance })));
const Page3Swot = lazy(() => import("./pages/Page3Swot").then((m) => ({ default: m.Page3Swot })));
const Page4Billing = lazy(() => import("./pages/Page4Billing").then((m) => ({ default: m.Page4Billing })));
const Page5Execution = lazy(() => import("./pages/Page5Execution").then((m) => ({ default: m.Page5Execution })));
const Page6Profitability = lazy(() => import("./pages/Page6Profitability").then((m) => ({ default: m.Page6Profitability })));
const Page7Acceptance = lazy(() => import("./pages/Page7Acceptance").then((m) => ({ default: m.Page7Acceptance })));
const Page8Review = lazy(() => import("./pages/Page8Review").then((m) => ({ default: m.Page8Review })));

function PageSkeleton() {
    return (
        <Card>
            <CardContent className="p-12">
                <div className="space-y-4 animate-pulse">
                    <div className="h-8 bg-muted rounded w-1/3" />
                    <div className="h-32 bg-muted rounded" />
                    <div className="h-32 bg-muted rounded" />
                </div>
            </CardContent>
        </Card>
    );
}

function applyMapper(data: Record<string, unknown>, pageNum: number): Record<string, unknown> {
    switch (pageNum) {
        case 1: return formToApi.page1(data as Parameters<typeof formToApi.page1>[0]) as unknown as Record<string, unknown>;
        case 2: return formToApi.page2(data as Parameters<typeof formToApi.page2>[0]) as unknown as Record<string, unknown>;
        case 3: return formToApi.page3(data as Parameters<typeof formToApi.page3>[0]) as unknown as Record<string, unknown>;
        case 4: return formToApi.page4(data as Parameters<typeof formToApi.page4>[0]) as unknown as Record<string, unknown>;
        case 5: return formToApi.page5(data as Parameters<typeof formToApi.page5>[0]) as unknown as Record<string, unknown>;
        case 6: return formToApi.page6(data as Parameters<typeof formToApi.page6>[0]) as unknown as Record<string, unknown>;
        case 7: return formToApi.page7(data as Parameters<typeof formToApi.page7>[0]) as unknown as Record<string, unknown>;
        default: return data;
    }
}

interface WoDetailsWizardProps {
    mode: "create" | "edit";
    woBasicDetailId: number;
    woDetailId?: number;
    existingData?: WoDetailData;
    initialPage?: number;
}

export function WoDetailsWizard({
    mode,
    woBasicDetailId,
    woDetailId: existingWoDetailId,
    existingData,
    initialPage = 1,
}: WoDetailsWizardProps) {
    const navigate = useNavigate();

    const [woDetailId, setWoDetailId] = useState<number | null>(existingWoDetailId || null);
    const hasAttemptedInit = useRef(false);
    const { data: existingDetail, isLoading: isLoadingExisting, isFetching: isFetchingExisting } = useWoDetailByBasicDetail(
        woBasicDetailId
    );
    const { data: basicDetail } = useWoBasicDetailById(woBasicDetailId);
    const tenderId = basicDetail?.tenderId;
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    const initializeWizard = useInitializeWizard();
    const savePageDraft = useSavePageDraft();
    const submitPage = useSubmitPage();
    const skipPage = useSkipPage();
    const submitAllPages = useSubmitAllPages();

    const [wizardState, setWizardState] = useState<WizardState>({
        currentPage: initialPage,
        woDetailId: existingWoDetailId || null,
        woBasicDetailId,
        status: existingData?.status || "draft",
    });

    useEffect(() => {
        if (mode === 'create' && !woDetailId && !isLoadingExisting && !isFetchingExisting && !hasAttemptedInit.current) {
            hasAttemptedInit.current = true;
            if (existingDetail?.id) {
                setWoDetailId(existingDetail.id);
                setWizardState((prev) => ({
                    ...prev,
                    woDetailId: existingDetail.id,
                    currentPage: existingDetail.currentPage || 1,
                    status: existingDetail.status || 'draft',
                }));
            } else {
                initializeWizard.mutate(woBasicDetailId, {
                    onSuccess: (result) => {
                        setWoDetailId(result.id);
                        setWizardState((prev) => ({
                            ...prev,
                            woDetailId: result.id,
                        }));
                    },
                    onError: () => {
                        toast.error("Failed to initialize wizard");
                    },
                });
            }
        }
    }, [mode, woDetailId, existingDetail, isLoadingExisting, isFetchingExisting, woBasicDetailId, initializeWizard]);

    const handleSaveAndContinue = async (data: Record<string, unknown>) => {
        if (!woDetailId) return;
        setIsSavingDraft(true);
        try {
            const mappedData = applyMapper(data, wizardState.currentPage);
            await submitPage.mutateAsync({ woDetailId, pageNum: wizardState.currentPage, data: mappedData });
            // After successful save, advance to next page
            if (wizardState.currentPage < WIZARD_CONFIG.TOTAL_PAGES) {
                setWizardState((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage + 1,
                    status: "in_progress",
                }));
            }
        } catch (error: any) {
            const serverErrors = error?.response?.data?.errors;
            if (serverErrors?.length) {
                return serverErrors;
            }
            toast.error(error?.response?.data?.message || "Failed to save");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSaveDraftOnly = async (data: Record<string, unknown>) => {
        if (!woDetailId) return;
        setIsSavingDraft(true);
        try {
            const mappedData = applyMapper(data, wizardState.currentPage);
            await savePageDraft.mutateAsync({ woDetailId, pageNum: wizardState.currentPage, data: mappedData });
            toast.success("Draft saved");
            return [];
        } catch (error: any) {
            const serverErrors = error?.response?.data?.errors;
            if (serverErrors?.length) {
                return serverErrors;
            }
            toast.error(error?.response?.data?.message || "Failed to save draft");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSkipPage = async () => {
        if (!woDetailId) return;
        try {
            await skipPage.mutateAsync({ woDetailId, pageNum: wizardState.currentPage });
            if (wizardState.currentPage < WIZARD_CONFIG.TOTAL_PAGES) {
                setWizardState((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage + 1,
                    status: "in_progress",
                }));
            }
        } catch {
            toast.error("Failed to skip page");
        }
    };

    const handleSubmitForReview = async () => {
        if (!woDetailId) return;
        await submitAllPages.mutateAsync(woDetailId);
        navigate(-1);
    };

    const handleBack = () => {
        if (wizardState.currentPage > 1) {
            setWizardState((prev) => ({
                ...prev,
                currentPage: prev.currentPage - 1,
            }));
        }
    };

    const handlePageClick = (pageNum: number) => {
        setWizardState((prev) => ({
            ...prev,
            currentPage: pageNum,
        }));
    };
    
    const renderCurrentPage = () => {
        const isReviewPage = wizardState.currentPage === 8;

        if (isReviewPage) {
            return (
                <Page8Review
                    woDetailId={woDetailId}
                    onSubmit={handleSubmitForReview}
                    onBack={handleBack}
                />
            );
        }

        const commonProps = {
            woDetailId: woDetailId || 0,
            woBasicDetailId,
            tenderId,
            onSaveDraft: handleSaveAndContinue,
            onSaveDraftOnly: handleSaveDraftOnly,
            onSkip: handleSkipPage,
            onBack: handleBack,
            isFirstPage: wizardState.currentPage === 1,
            isLastPage: wizardState.currentPage === 7,
            isSaving: isSavingDraft,
        };

        const currentPage = wizardState.currentPage;

        switch (currentPage) {
            case 1:
                return <Page1Handover {...commonProps} initialData={existingData ? apiToForm.page1(existingData) : undefined} />;
            case 2:
                return <Page2Compliance {...commonProps} initialData={existingData ? apiToForm.page2(existingData) : undefined} />;
            case 3:
                return <Page3Swot {...commonProps} initialData={existingData ? apiToForm.page3(existingData) : undefined} />;
            case 4:
                return <Page4Billing {...commonProps} initialData={existingData ? apiToForm.page4(existingData) : undefined} />;
            case 5:
                return <Page5Execution {...commonProps} initialData={existingData ? apiToForm.page5(existingData) : undefined} />;
            case 6:
                return <Page6Profitability {...commonProps} initialData={existingData ? apiToForm.page6(existingData) : undefined} />;
            case 7:
                return <Page7Acceptance {...commonProps} initialData={existingData ? apiToForm.page7(existingData) : undefined} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {mode === "create" ? "Create" : "Edit"} WO Details
                    </h1>
                    <p className="text-muted-foreground">
                        Complete all pages to submit for TL review
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                </Button>
            </div>

            <Card className="px-0 bg-transparent border-none">
                <CardContent>
                    <WizardStepper
                        currentPage={wizardState.currentPage}
                        completedPages={[]}
                        skippedPages={[]}
                        onPageClick={handlePageClick}
                        totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    />
                </CardContent>
            </Card>

            <Suspense fallback={<PageSkeleton />}>
                {renderCurrentPage()}
            </Suspense>
        </div>
    );
}
