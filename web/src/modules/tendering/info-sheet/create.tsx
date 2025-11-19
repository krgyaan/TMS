import { useParams, useNavigate } from "react-router-dom"
import { TenderInformationForm } from "./components/InfoSheetForm"
import { useTender } from "@/hooks/api/useTenders"
import { useInfoSheet } from "@/hooks/api/useInfoSheets"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useEffect } from "react"
import { paths } from "@/app/routes/paths"

const InfoSheetCreatePage = () => {
    const { tenderId } = useParams<{ tenderId: string }>()
    const navigate = useNavigate()
    const numericId = tenderId ? Number(tenderId) : NaN

    const { data: tender, isLoading: isTenderLoading } = useTender(Number.isNaN(numericId) ? null : numericId)
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(Number.isNaN(numericId) ? null : numericId)

    useEffect(() => {
        // If info sheet already exists, redirect to edit page
        if (!isInfoSheetLoading && infoSheet && numericId) {
            navigate(paths.tendering.infoSheetEdit(numericId), { replace: true })
        }
    }, [isInfoSheetLoading, infoSheet, navigate, numericId])

    if (!tenderId || Number.isNaN(numericId)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid tender reference provided.</AlertDescription>
            </Alert>
        )
    }

    // Show loading state while checking if info sheet exists
    if (isInfoSheetLoading) {
        return (
            <TenderInformationForm
                mode="create"
                tenderId={numericId}
                tender={tender ?? null}
                isTenderLoading={isTenderLoading}
                isInfoSheetLoading={true}
            />
        )
    }

    return (
        <TenderInformationForm
            mode="create"
            tenderId={numericId}
            tender={tender ?? null}
            isTenderLoading={isTenderLoading}
        />
    )
}

export default InfoSheetCreatePage
