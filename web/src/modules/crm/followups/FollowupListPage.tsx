import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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
import { useLead } from "@/hooks/api/useLeads";
import { MailTab }     from "./components/MailTab";
import { CallTab }     from "./components/CallTab";
import { VisitTab }    from "./components/VisitTab";
import { LetterTab }   from "./components/LetterTab";
import { WhatsappTab } from "./components/WhatsappTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type FollowupTabType = 'mail' | 'call' | 'visit' | 'letter' | 'whatsapp';

// ─── Tab Config ───────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function FollowupListPage() {
    const { leadId } = useParams<{ leadId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<FollowupTabType>('mail');

    const leadIdNum = leadId ? Number(leadId) : null;
    const { data: lead, isLoading: leadLoading } = useLead(leadIdNum);

    // ── Loading ───────────────────────────────────────────────────────

    if (leadLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────

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

    // ── Render ────────────────────────────────────────────────────────

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Update Follow-up</CardTitle>
                        <CardDescription>
                            <span className="font-medium text-foreground">
                                {lead.companyName || "—"}
                            </span>
                            {lead.name && (
                                <span className="text-muted-foreground">
                                    {" "}— {lead.name}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Leads
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as FollowupTabType)}
                    className="w-full"
                >
                    {/* ── Tab List ─────────────────────────────────── */}
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

                    {/* ── Tab Contents ─────────────────────────────── */}
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