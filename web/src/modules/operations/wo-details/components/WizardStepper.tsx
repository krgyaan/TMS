import { Check, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_PAGES } from "../helpers/constants";

interface WizardStepperProps {
    currentPage: number;
    completedPages: number[];
    skippedPages: number[];
    onPageClick?: (pageNum: number) => void;
}

export function WizardStepper({
    currentPage,
    completedPages,
    skippedPages,
    onPageClick,
}: WizardStepperProps) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {WIZARD_PAGES.map((page, index) => {
                    const isCompleted = completedPages.includes(page.pageNum);
                    const isSkipped = skippedPages.includes(page.pageNum);
                    const isCurrent = currentPage === page.pageNum;
                    const isClickable = page.pageNum <= currentPage || isCompleted || isSkipped;

                    return (
                        <div key={page.pageNum} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <button
                                type="button"
                                disabled={!isClickable}
                                onClick={() => isClickable && onPageClick?.(page.pageNum)}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                                    isCompleted && "bg-green-500 border-green-500 text-white",
                                    isSkipped && "bg-yellow-500 border-yellow-500 text-white",
                                    isCurrent && !isCompleted && "bg-orange-500 border-orange-500 text-white",
                                    !isCurrent && !isCompleted && !isSkipped && "bg-muted border-muted-foreground/30 text-muted-foreground",
                                    isClickable && "cursor-pointer hover:opacity-80"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-5 w-5" />
                                ) : isSkipped ? (
                                    <SkipForward className="h-4 w-4" />
                                ) : (
                                    <span className="text-sm font-semibold">{page.pageNum}</span>
                                )}
                            </button>

                            {/* Connector Line */}
                            {index < WIZARD_PAGES.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-1 mx-2",
                                        isCompleted || isSkipped ? "bg-green-500" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Current Page Info */}
            <div className="mt-4 text-center">
                <h2 className="text-lg font-semibold">
                    Step {currentPage}: {WIZARD_PAGES[currentPage - 1]?.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {WIZARD_PAGES[currentPage - 1]?.description}
                </p>
            </div>
        </div>
    );
}
