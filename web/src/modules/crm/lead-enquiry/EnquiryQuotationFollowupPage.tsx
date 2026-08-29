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
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { MailTab }     from "../leadfollowup/components/MailTab";
import { CallTab }     from "../leadfollowup/components/CallTab";
import { VisitTab }    from "../leadfollowup/components/VisitTab";
import { LetterTab }   from "../leadfollowup/components/LetterTab";
import { WhatsappTab } from "../leadfollowup/components/WhatsappTab";

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

const getValidTab = (tab: string | null): FollowupTabType => {
    if (tab && VALID_TABS.includes(tab as FollowupTabType)) {
        return tab as FollowupTabType;
    }
    return 'mail';
};

export default function EnquiryQuotationFollowupPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState<FollowupTabType>(getValidTab(searchParams.get('tab')));

    const enquiryId = id ? Number(id) : null;
    const { data: enquiry, isLoading } = useLeadEnquiry(enquiryId);
    const { data: bidSubmission } = useBidSubmissionByTender(enquiry?.tenderId ?? 0);
    const quotationDocs = bidSubmission?.documents?.submittedDocs ?? [];

    useEffect(() => {
        if (!searchParams.get('tab')) {
            setSearchParams({ tab: activeTab }, { replace: true });
        }
    }, []);

    const handleTabChange = (value: string) => {
        const newTab = value as FollowupTabType;
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!enquiryId || isNaN(enquiryId) || !enquiry) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Enquiry not found or invalid ID.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.crm.enquiries)}
                    >
                        Back to Enquiries
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const source = { sourceType: 'enquiry' as const, sourceId: enquiryId };

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-1 -ml-2"
                            onClick={() => navigate(paths.crm.enquiries)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Enquiries
                        </Button>
                        <h2 className="text-lg font-semibold">
                            Quotation Follow-up: {enquiry.enqName}
                        </h2>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.crm.enquiryView(enquiryId))}
                    >
                        View Enquiry
                    </Button>
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

                    <TabsContent value="mail" forceMount className={activeTab === 'mail' ? '' : 'hidden'}>
                        <MailTab source={source} initialAttachments={quotationDocs} />
                    </TabsContent>

                    <TabsContent value="call" forceMount className={activeTab === 'call' ? '' : 'hidden'}>
                        <CallTab source={source} />
                    </TabsContent>

                    <TabsContent value="visit" forceMount className={activeTab === 'visit' ? '' : 'hidden'}>
                        <VisitTab source={source} />
                    </TabsContent>

                    <TabsContent value="letter" forceMount className={activeTab === 'letter' ? '' : 'hidden'}>
                        <LetterTab source={source} />
                    </TabsContent>

                    <TabsContent value="whatsapp" forceMount className={activeTab === 'whatsapp' ? '' : 'hidden'}>
                        <WhatsappTab source={source} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
