import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, SkipForward, Save, Send } from "lucide-react";

interface WizardNavigationProps {
    currentPage: number;
    totalPages: number;
    canSkip: boolean;
    isSubmitting: boolean;
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
    onBack,
    onSubmit,
    onSkip,
    onSaveDraft,
}: WizardNavigationProps) {
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    return (
        <div className="flex items-center justify-between pt-6 border-t mt-6">
            {/* Left Side */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    disabled={isFirstPage || isSubmitting}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onSaveDraft}
                    disabled={isSubmitting}
                >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                </Button>
            </div>

            {/* Right Side */}
            <div className="flex gap-2">
                {canSkip && !isLastPage && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onSkip}
                        disabled={isSubmitting}
                    >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip & Proceed
                    </Button>
                )}

                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                    {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                    {isLastPage ? (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit for Review
                        </>
                    ) : (
                        <>
                            Submit & Proceed
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
