import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { WizardStepper } from "./WizardStepper";
import { Page1Handover } from "./pages/Page1Handover";
import { Page2Compliance } from "./pages/Page2Compliance";
import { Page3Swot } from "./pages/Page3Swot";
import { Page4Billing } from "./pages/Page4Billing";
import { Page5Execution } from "./pages/Page5Execution";
import { Page6Profitability } from "./pages/Page6Profitability";
import { Page7Acceptance } from "./pages/Page7Acceptance";

import type { WizardState, WoDetailData } from "../helpers/woDetail.types";

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
    const [isLoading, setIsLoading] = useState(false);
    const [woDetailId, setWoDetailId] = useState<number | null>(existingWoDetailId || null);

    const [wizardState, setWizardState] = useState<WizardState>({
        currentPage: initialPage,
        completedPages: existingData?.completedPages || [],
        skippedPages: existingData?.skippedPages || [],
        woDetailId: existingWoDetailId || null,
        woBasicDetailId,
        status: existingData?.status || "draft",
    });

    // Initialize from existing data in edit mode
    useEffect(() => {
        if (mode === "edit" && existingData) {
            setWizardState((prev) => ({
                ...prev,
                currentPage: initialPage || existingData.currentPage || 1,
                completedPages: existingData.completedPages || [],
                skippedPages: existingData.skippedPages || [],
                status: existingData.status || "draft",
            }));
        }
    }, [mode, existingData, initialPage]);

    const handleSubmitPage = () => {
        const { currentPage, completedPages } = wizardState;

        // Mark current page as completed
        const newCompleted = [...completedPages];
        if (!newCompleted.includes(currentPage)) {
            newCompleted.push(currentPage);
        }

        // Remove from skipped if it was skipped before
        const newSkipped = wizardState.skippedPages.filter((p) => p !== currentPage);

        if (currentPage < 7) {
            setWizardState({
                ...wizardState,
                currentPage: currentPage + 1,
                completedPages: newCompleted,
                skippedPages: newSkipped,
                status: "in_progress",
            });
        } else {
            // Final submission
            setWizardState({
                ...wizardState,
                completedPages: newCompleted,
                skippedPages: newSkipped,
                status: "submitted_for_review",
            });
            toast.success("WO Details submitted for review!");
            // Navigate back to list
            navigate(-1);
        }
    };

    const handleSkipPage = () => {
        const { currentPage, skippedPages } = wizardState;

        // Mark current page as skipped
        const newSkipped = [...skippedPages];
        if (!newSkipped.includes(currentPage)) {
            newSkipped.push(currentPage);
        }

        if (currentPage < 7) {
            setWizardState({
                ...wizardState,
                currentPage: currentPage + 1,
                skippedPages: newSkipped,
                status: "in_progress",
            });
        }
    };

    const handleBack = () => {
        if (wizardState.currentPage > 1) {
            setWizardState({
                ...wizardState,
                currentPage: wizardState.currentPage - 1,
            });
        }
    };

    const handlePageClick = (pageNum: number) => {
        setWizardState({
            ...wizardState,
            currentPage: pageNum,
        });
    };

    const getPageData = (pageNum: number) => {
        if (!existingData) return undefined;

        // Return relevant data for each page from existingData
        switch (pageNum) {
            case 1:
                return {
                    contacts: existingData.contacts,
                    tenderDocumentsChecklist: existingData.tenderDocumentsChecklist,
                };
            case 2:
                return {
                    ldApplicable: existingData.ldApplicable,
                    maxLd: existingData.maxLd,
                    ldStartDate: existingData.ldStartDate,
                    maxLdDate: existingData.maxLdDate,
                    isPbgApplicable: existingData.isPbgApplicable,
                    filledBgFormat: existingData.filledBgFormat,
                    pbgBgId: existingData.pbgBgId,
                    isContractAgreement: existingData.isContractAgreement,
                    contractAgreementFormat: existingData.contractAgreementFormat,
                    detailedPoApplicable: existingData.detailedPoApplicable,
                    detailedPoFollowupId: existingData.detailedPoFollowupId,
                };
            case 3:
                return {
                    swotStrengths: existingData.swotStrengths,
                    swotWeaknesses: existingData.swotWeaknesses,
                    swotOpportunities: existingData.swotOpportunities,
                    swotThreats: existingData.swotThreats,
                };
            case 4:
                return {
                    billingBoq: existingData.billingBoq,
                    buybackBoq: existingData.buybackBoq,
                    billingAddresses: existingData.billingAddresses,
                    shippingAddresses: existingData.shippingAddresses,
                };
            case 5:
                return {
                    siteVisitNeeded: existingData.siteVisitNeeded,
                    siteVisitPerson: existingData.siteVisitPerson,
                    documentsFromTendering: existingData.documentsFromTendering,
                    documentsNeeded: existingData.documentsNeeded,
                    documentsInHouse: existingData.documentsInHouse,
                };
            case 6:
                return {
                    costingSheetLink: existingData.costingSheetLink,
                    hasDiscrepancies: existingData.hasDiscrepancies,
                    discrepancyComments: existingData.discrepancyComments,
                    budgetPreGst: existingData.budgetPreGst,
                    budgetSupply: existingData.budgetSupply,
                    budgetService: existingData.budgetService,
                    budgetFreight: existingData.budgetFreight,
                    budgetAdmin: existingData.budgetAdmin,
                    budgetBuybackSale: existingData.budgetBuybackSale,
                };
            case 7:
                return {
                    oeWoAmendmentNeeded: existingData.oeWoAmendmentNeeded,
                    amendments: existingData.amendments,
                    oeSignaturePrepared: existingData.oeSignaturePrepared,
                    courierRequestPrepared: existingData.courierRequestPrepared,
                };
            default:
                return undefined;
        }
    };

    const renderCurrentPage = () => {
        const commonProps = {
            woDetailId: woDetailId || 0,
            woBasicDetailId,
            onSubmit: handleSubmitPage,
            onSkip: handleSkipPage,
            onBack: handleBack,
            isFirstPage: wizardState.currentPage === 1,
            isLastPage: wizardState.currentPage === 7,
            isLoading,
        };

        const pageData = getPageData(wizardState.currentPage);

        switch (wizardState.currentPage) {
            case 1:
                return <Page1Handover {...commonProps} initialData={pageData} />;
            case 2:
                return <Page2Compliance {...commonProps} initialData={pageData} />;
            case 3:
                return <Page3Swot {...commonProps} initialData={pageData} />;
            case 4:
                return <Page4Billing {...commonProps} initialData={pageData} />;
            case 5:
                return <Page5Execution {...commonProps} initialData={pageData} />;
            case 6:
                return <Page6Profitability {...commonProps} initialData={pageData} />;
            case 7:
                return <Page7Acceptance {...commonProps} initialData={pageData} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Stepper */}
            <Card className="px-0 bg-transparent border-none">
                <CardContent>
                    <WizardStepper
                        currentPage={wizardState.currentPage}
                        completedPages={wizardState.completedPages}
                        skippedPages={wizardState.skippedPages}
                        onPageClick={handlePageClick}
                    />
                </CardContent>
            </Card>

            {/* Current Page Form */}
            {renderCurrentPage()}
        </div>
    );
}
