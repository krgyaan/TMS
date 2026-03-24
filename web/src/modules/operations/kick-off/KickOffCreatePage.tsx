import { useParams } from "react-router-dom";
import { useWoContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { useKickoffMeetingByWoId } from '@/hooks/api/useKickoffMeeting';
import { useWoDetailById } from '@/hooks/api/useWoDetails';
import { Skeleton } from "@/components/ui/skeleton";
import { WoKickoffMeeting } from "./components/KickOffForm";

const KickOffCreatePage = () => {
    const { woId } = useParams();
    const woDetailId = Number(woId);

    const { data: woDetail, isLoading: isLoadingWoDetail } = useWoDetailById(woDetailId);
    const woBasicDetailId = woDetail?.woBasicDetailId;

    const { data: woContactsData, isLoading: isLoadingContacts } = useWoContactsByBasicDetail(woBasicDetailId!);
    const { data: kickoffData, isLoading: isLoadingKickoff } = useKickoffMeetingByWoId(woDetailId);

    if (isLoadingWoDetail || isLoadingContacts || isLoadingKickoff) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <WoKickoffMeeting
            kickoffData={kickoffData}
            woContactsData={woContactsData}
            woDetailId={woDetailId}
            woBasicDetailId={woBasicDetailId!}
        />
    );
};

export default KickOffCreatePage;
