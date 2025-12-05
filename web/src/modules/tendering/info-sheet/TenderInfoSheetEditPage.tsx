import { useParams, useNavigate } from "react-router-dom"
import { TenderInformationForm } from "./components/InfoSheetForm"
import { useTender } from "@/hooks/api/useTenders"
import { useInfoSheet } from "@/hooks/api/useInfoSheets"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useEffect } from "react"
import { paths } from "@/app/routes/paths"

const InfoSheetEditPage = () => {
    const { tenderId } = useParams<{ tenderId: string }>()
    const navigate = useNavigate()
    const numericId = tenderId ? Number(tenderId) : NaN

    const { data: tender, isLoading: isTenderLoading } = useTender(Number.isNaN(numericId) ? null : numericId)
    const { data: infoSheet, isLoading: isInfoSheetLoading, error: infoSheetError } = useInfoSheet(Number.isNaN(numericId) ? null : numericId)

    useEffect(() => {
        // If info sheet doesn't exist, redirect to create page
        if (!isInfoSheetLoading && infoSheetError && numericId) {
            navigate(paths.tendering.infoSheetCreate(numericId))
        }
    }, [isInfoSheetLoading, infoSheetError, navigate, numericId])

    if (!tenderId || Number.isNaN(numericId)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid tender reference provided.</AlertDescription>
            </Alert>
        )
    }

    return (
        <TenderInformationForm
            mode="edit"
            tenderId={numericId}
            tender={tender ?? null}
            initialData={infoSheet ?? null}
            isTenderLoading={isTenderLoading}
            isInfoSheetLoading={isInfoSheetLoading}
        />
    )
}

export default InfoSheetEditPage
