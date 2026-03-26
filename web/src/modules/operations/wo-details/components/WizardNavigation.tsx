import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, SkipForward, Save, Loader2, Check } from "lucide-react";
import { WIZARD_CONFIG } from "../helpers/constants";

interface WizardNavigationProps {
    currentPage: number;
    totalPages: number;
    canSkip: boolean;
    isSubmitting: boolean;
    isSaving?: boolean;
    onBack: () => void;
    onSubmit: () => void;
    onSkip: () => void;
    onSaveDraft: () => void;
}

export function WizardNavigation({
    currentPage,
    totalPages,
    canSkip,
    isSubmitting,
    isSaving = false,
    onBack,
    onSubmit,
    onSkip,
    onSaveDraft,
}: WizardNavigationProps) {
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;
    const isSkippable = canSkip && WIZARD_CONFIG.SKIPPABLE_PAGES.includes(currentPage);

    return (
        <div className="flex items-center justify-between pt-6 border-t">
            <div>
                {!isFirstPage && (
                    <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onSaveDraft} disabled={isSubmitting || isSaving}>
                    {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Draft"}
                </Button>

                {isSkippable && !isLastPage && (
                    <Button type="button" variant="outline" onClick={onSkip} disabled={isSubmitting}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip
                    </Button>
                )}

                <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isLastPage ? (
                        <Check className="mr-2 h-4 w-4" />
                    ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? "Saving..." : isLastPage ? "Submit for Review" : "Save & Continue"}
                </Button>
            </div>
        </div>
    );
}
