import { useParams } from "react-router-dom";
import { useWoContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { useKickoffMeetingByWoId } from '@/hooks/api/useKickoffMeeting';
import { Skeleton } from "@/components/ui/skeleton";
import { WoKickoffMeeting } from "./components/KickOffForm";

const KickOffCreatePage = () => {
    const { woId } = useParams();
    const { data: woContactsData, isLoading: isLoadingContacts } = useWoContactsByBasicDetail(Number(woId));
    const { data: kickoffData, isLoading: isLoadingKickoff } = useKickoffMeetingByWoId(Number(woId));

    if (isLoadingContacts || isLoadingKickoff) {
        return <Skeleton>
            <div className="flex items-center space-x-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        </Skeleton>
    }

    return <WoKickoffMeeting kickoffData={kickoffData} woContactsData={woContactsData} />;
};

export default KickOffCreatePage;
