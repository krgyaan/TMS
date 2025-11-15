import { useParams } from "react-router-dom"
import { TenderInformationForm } from "./components/InfoSheetForm"
import { useTender } from "@/hooks/api/useTenders"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const InfoSheetCreatePage = () => {
    const { tenderId } = useParams<{ tenderId: string }>()
    const numericId = tenderId ? Number(tenderId) : NaN
    const { data: tender, isLoading } = useTender(Number.isNaN(numericId) ? null : numericId)

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
            mode="create"
            tenderId={numericId}
            tender={tender ?? null}
            isTenderLoading={isLoading}
        />
    )
}

export default InfoSheetCreatePage
