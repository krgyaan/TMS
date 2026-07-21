import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    FileText,
    MessageCircle,
    AlertCircle,
    History, 
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLead } from "@/hooks/api/useLeads";
import { MailTab }     from "./components/MailTab";
import { CallTab }     from "./components/CallTab";
import { VisitTab }    from "./components/VisitTab";
import { LetterTab }   from "./components/LetterTab";
import { WhatsappTab } from "./components/WhatsappTab";

type FollowupTabType = 'mail' | 'call' | 'visit' | 'letter' | 'whatsapp';

const VALID_TABS: FollowupTabType[] = ['mail', 'call', 'visit', 'letter', 'whatsapp'];

const FOLLOWUP_TABS: {
    key: FollowupTabType;
    label: string;
    icon: React.ReactNode;
}[] = [
    { key: 'mail',     label: 'Mail',      icon: <Mail          className="h-4 w-4" /> },
    { key: 'call',     label: 'Call',      icon: <Phone         className="h-4 w-4" /> },
    { key: 'visit',    label: 'Visit',     icon: <MapPin        className="h-4 w-4" /> },
    { key: 'letter',   label: 'Letter',    icon: <FileText      className="h-4 w-4" /> },
    { key: 'whatsapp', label: 'WhatsApp',  icon: <MessageCircle className="h-4 w-4" /> },
];

const LAST_TAB_KEY = 'crm_followup_last_tab';

const getValidTab = (tab: string | null): FollowupTabType => {
    if (tab && VALID_TABS.includes(tab as FollowupTabType)) {
        return tab as FollowupTabType;
    }
    return 'mail';
};

export default function FollowupListPage() {
    const { leadId } = useParams<{ leadId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const getInitialTab = (): FollowupTabType => {
        const urlTab = searchParams.get('tab');
        if (urlTab && VALID_TABS.includes(urlTab as FollowupTabType)) {
            return urlTab as FollowupTabType;
        }
        const savedTab = localStorage.getItem(LAST_TAB_KEY);
        return getValidTab(savedTab);
    };

    const [activeTab, setActiveTab] = useState<FollowupTabType>(getInitialTab);

    const leadIdNum = leadId ? Number(leadId) : null;
    const { data: lead, isLoading: leadLoading } = useLead(leadIdNum);

    useEffect(() => {
        if (!searchParams.get('tab')) {
            setSearchParams({ tab: activeTab }, { replace: true });
        }
    }, []);

    const handleTabChange = (value: string) => {
        const newTab = value as FollowupTabType;
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
        localStorage.setItem(LAST_TAB_KEY, newTab);
    };

    if (leadLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!leadIdNum || isNaN(leadIdNum) || !lead) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Lead not found or invalid ID.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        Back to Leads
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-1 -ml-2"
                            onClick={() => navigate(paths.crm.leads)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Leads
                        </Button>
                        
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate(paths.crm.leadFollowupHistory(leadIdNum))}
                        >
                            <History className="h-4 w-4 mr-1" />
                            View History
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="w-full"
                >
                    <TabsList className="mb-6">
                        {FOLLOWUP_TABS.map(tab => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="flex items-center gap-2 data-[state=active]:shadow-md"
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="mail">
                        <MailTab leadId={leadIdNum} />
                    </TabsContent>

                    <TabsContent value="call">
                        <CallTab leadId={leadIdNum} />
                    </TabsContent>

                    <TabsContent value="visit">
                        <VisitTab leadId={leadIdNum} />
                    </TabsContent>

                    <TabsContent value="letter">
                        <LetterTab leadId={leadIdNum} />
                    </TabsContent>

                    <TabsContent value="whatsapp">
                        <WhatsappTab leadId={leadIdNum} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}