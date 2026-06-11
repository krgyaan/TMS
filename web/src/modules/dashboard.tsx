import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { 
    ChevronRight, 
    FileText, 
    Landmark, 
    Send, 
    Truck, 
    Wallet, 
    Search, 
    Loader2, 
    AlertCircle, 
    Check, 
    Clock, 
    AlertTriangle 
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIncompleteOnboarding } from "@/modules/hrms/onboarding/useOnboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

// Types
interface TenderInfo {
    id: string;
    tender_name: string;
    due_date: string;
    team_member: string;
    users: {
        name: string;
    };
    tq_received: Array<{
        tq_submission_date?: string;
    }>;
}

interface FollowUp {
    id: string;
    party_name: string;
    created_at: string;
    assigned_to: string;
}

interface DashboardData {
    role: string;
    google_oauth_connected: boolean;
    userCount: number;
    tenderInfoCount: number;
    bided: number;
    tender_info: TenderInfo[];
    follow_ups: FollowUp[];
}

// Mock data - replace with actual API calls
const mockDashboardData: DashboardData = {
    role: "Admin",
    google_oauth_connected: false,
    userCount: 45,
    tenderInfoCount: 123,
    bided: 67,
    tender_info: [
        {
            id: "1",
            tender_name: "Road Construction Project",
            due_date: "2024-02-15",
            team_member: "user1",
            users: { name: "John Doe" },
            tq_received: [{ tq_submission_date: "2024-02-10" }],
        },
        {
            id: "2",
            tender_name: "Building Maintenance",
            due_date: "2024-02-20",
            team_member: "user2",
            users: { name: "Jane Smith" },
            tq_received: [],
        },
    ],
    follow_ups: [
        {
            id: "1",
            party_name: "ABC Corporation",
            created_at: "2024-02-05",
            assigned_to: "user1",
        },
    ],
};

const mockUsers = [
    { id: "user1", name: "John Doe" },
    { id: "user2", name: "Jane Smith" },
    { id: "user3", name: "Mike Johnson" },
];

const QuickActionCard = ({ icon: Icon, title, subtitle, color, bgColor, onClick }: any) => (
    <button 
        onClick={onClick}
        className="group relative flex flex-col items-start p-4 bg-background border border-border/50 rounded-2xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden text-left w-full"
    >
        <div className={cn("mb-3 p-2.5 rounded-xl transition-colors duration-300", bgColor, color)}>
            <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
    </button>
);

const OnboardingTrackerWidget = () => {
    const { data: incompleteList, isLoading, error } = useIncompleteOnboarding();
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const filteredList = useMemo(() => {
        if (!incompleteList) return [];
        return incompleteList.filter(user => 
            (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [incompleteList, searchQuery]);

    const getStatusIndicator = (status: string | null | undefined, label: string) => {
        const isCompleted = status === "submitted" || status === "resubmitted";
        const isRejected = status === "rejected";
        const isApproved = status === "approved";

        let bgColor = "bg-muted text-muted-foreground border-muted-foreground/20";
        let icon = <Clock className="h-3 w-3" />;
        let text = "Pending";

        if (isCompleted) {
            bgColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400";
            icon = <Check className="h-3 w-3" />;
            text = status === "resubmitted" ? "Resubmitted" : "Submitted";
        } else if (isApproved) {
            bgColor = "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400";
            icon = <Check className="h-3 w-3" />;
            text = "Approved";
        } else if (isRejected) {
            bgColor = "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400";
            icon = <AlertTriangle className="h-3 w-3" />;
            text = "Rejected";
        } else if (status === "in_progress") {
            bgColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400";
            text = "In Progress";
        }

        return (
            <div className="flex flex-col items-center gap-1 flex-1 min-w-[70px]">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium w-full justify-center transition-all duration-300",
                    bgColor
                )}>
                    {icon}
                    <span className="truncate">{text}</span>
                </span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card className="border border-border/50 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading onboarding submissions...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border border-border/50 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center space-x-3 text-red-500 justify-center py-6">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-semibold">Failed to load onboarding submissions</span>
                </div>
            </Card>
        );
    }

    const totalIncomplete = incompleteList?.length || 0;

    return (
        <Card className="border border-border/50 shadow-xl bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
            <CardHeader className="pb-4 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <CardTitle className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                Onboarding Status Tracker
                            </CardTitle>
                            <Badge variant="destructive" className="animate-pulse font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                                {totalIncomplete} Pending
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Employees who have not submitted all onboarding documents and details
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employee name/email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background/50 border-border/50 rounded-xl text-xs focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-500/20">
                            <Check className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">
                            {searchQuery ? "No matching employees found" : "All Caught Up!"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">
                            {searchQuery 
                                ? "No employees match your search query. Try another name or email."
                                : "Every employee has successfully submitted their complete onboarding!"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto custom-scrollbar">
                        {filteredList.map((user) => {
                            const statuses = [
                                user.profileStatus,
                                user.documentStatus,
                                user.educationStatus,
                                user.experienceStatus,
                                user.bankStatus,
                            ];
                            const submittedCount = statuses.filter(s => s === "submitted" || s === "resubmitted" || s === "approved").length;
                            const progressPercent = Math.round((submittedCount / 5) * 100);

                            const initials = (user.name || "")
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase() || "??";

                            let hash = 0;
                            const nameForHash = user.name || "Unknown";
                            for (let i = 0; i < nameForHash.length; i++) {
                                hash = nameForHash.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const avatarColor = `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;

                            return (
                                <div 
                                    key={user.id}
                                    className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-muted/30 transition-all duration-300 group"
                                >
                                    <div className="flex items-center gap-4 min-w-[240px]">
                                        <Avatar className="h-10 w-10 rounded-xl ring-1 ring-border/50 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            {user.avatar && <AvatarImage src={user.avatar} className="object-cover" />}
                                            <AvatarFallback className="rounded-xl text-white font-bold text-xs" style={{ backgroundColor: avatarColor }}>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                {user.name}
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                                    <div 
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            progressPercent >= 80 ? "bg-emerald-500" :
                                                            progressPercent >= 40 ? "bg-amber-500" : "bg-orange-500"
                                                        )}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] font-bold text-muted-foreground">{progressPercent}% Submitted</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-1 justify-start xl:justify-center">
                                        {getStatusIndicator(user.profileStatus, "Profile")}
                                        {getStatusIndicator(user.documentStatus, "Documents")}
                                        {getStatusIndicator(user.educationStatus, "Education")}
                                        {getStatusIndicator(user.experienceStatus, "Experience")}
                                        {getStatusIndicator(user.bankStatus, "Bank")}
                                    </div>

                                    <div className="flex items-center justify-end flex-shrink-0 pl-4">
                                        <button
                                            onClick={() => navigate(`/hrms/onboarding/dashboard`)}
                                            className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
                                        >
                                            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData);
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [currentTime, setCurrentTime] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const {teamId, isSuperUser, isAdmin} = useAuth();

    const isTenderingTeam = teamId == 1 || teamId == 2 || isSuperUser || isAdmin;

    const quickActions = [
        {
            title: "Add Imprest",
            subtitle: "Create New Imprest Entry",
            icon: Wallet,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/30",
            path: paths.shared.imprestCreate
        },
        {
            title: "Add Courier",
            subtitle: "Create New Courier Entry",
            icon: Truck,
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-950/30",
            path: paths.shared.courierCreate
        },
        {
            title: "New Tender",
            subtitle: "Create New Tender Entry",
            icon: FileText,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            path: paths.tendering.tenderCreate
        },
        {
            title: "New Follow-up",
            subtitle: "Create New Follow Up",
            icon: Send,
            color: "text-orange-600",
            bgColor: "bg-orange-50 dark:bg-orange-950/30",
            path: paths.shared.followUpCreate
        },
        {
            title: "BI Other Than EMDs",
            subtitle: "Request New BI",
            icon: Landmark,
            color: "text-pink-600",
            bgColor: "bg-pink-50 dark:bg-pink-950/30",
            path: paths.tendering.biOtherThanEmdsCreate()
        },
    ];

    // Update current time
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString("en-US", {
                hour12: true,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
            setCurrentTime(timeString);
        };
        setDashboardData(mockDashboardData);
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Generate team colors
    const teamColors = useMemo(() => {
        const colors: Record<string, string> = {};
        let index = 0;

        dashboardData.tender_info.forEach(tender => {
            const member = tender.users?.name || "Unknown";
            if (!colors[member]) {
                const hue = (index * 137) % 360;
                colors[member] = `hsl(${hue}, 70%, 50%)`;
                index++;
            }
        });

        return colors;
    }, [dashboardData.tender_info]);

    // Calendar events
    const calendarEvents = useMemo(() => {
        const events: Array<{
            title: string;
            date: string;
            type: "tender_due" | "tq_date" | "followup";
            user: string;
            color: string;
        }> = [];

        // Tender due dates
        dashboardData.tender_info.forEach(tender => {
            events.push({
                title: `Tender due - ${tender.tender_name}`,
                date: tender.due_date,
                type: "tender_due",
                user: tender.team_member,
                color: teamColors[tender.users?.name || "Unknown"] || "#888",
            });

            // TQ dates
            const tq = tender.tq_received?.[0];
            if (tq?.tq_submission_date) {
                events.push({
                    title: `TQ Date - ${tender.tender_name}`,
                    date: tq.tq_submission_date,
                    type: "tq_date",
                    user: tender.team_member,
                    color: "#ff9800",
                });
            }
        });

        // Follow-ups
        dashboardData.follow_ups.forEach(followUp => {
            events.push({
                title: `Followup - ${followUp.party_name}`,
                date: followUp.created_at.split(" ")[0], // Get date part only
                type: "followup",
                user: followUp.assigned_to,
                color: "#0000ff",
            });
        });

        return events.filter(event => selectedUser === "all" || event.user === selectedUser);
    }, [dashboardData, teamColors, selectedUser]);

    const getEventBadge = (type: string) => {
        switch (type) {
            case "tender_due":
                return <Badge variant="destructive">Due</Badge>;
            case "tq_date":
                return <Badge variant="secondary">TQ</Badge>;
            case "followup":
                return <Badge variant="default">Follow-up</Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 p-8">
            {/* Quick Actions */}

            {/* Onboarding Status Tracker Widget */}
            {(teamId == 8 ) && (
                <OnboardingTrackerWidget />
            )}
            

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions
                    .filter(action => action.title !== "New Tender" || isTenderingTeam)
                    .map((action) => (
                    <QuickActionCard 
                        key={action.title}
                        {...action}
                        onClick={() => navigate(action.path)}
                    />
                ))}
            </div>

            {/* Statistics Cards */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardData.role === "Admin" && (
                    <Card className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{dashboardData.userCount}</div>
                        </CardContent>
                    </Card>
                )}

                {dashboardData.role !== "Admin" && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">
                                    {new Date().toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </div>
                                <div className="text-lg font-mono">{currentTime}</div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{dashboardData.tenderInfoCount}</div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                        <GanttChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{dashboardData.bided}</div>
                    </CardContent>
                </Card>
            </div> */}



            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Calendar Section */}
                <Card className="col-span-2">
                    <CardHeader>
                        {/* User Filter - Only for Admin */}
                        {dashboardData.role === "Admin" && (
                            <div className="flex items-center space-x-4">
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        {mockUsers.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Color Legend */}
                                <div className="flex items-center space-x-2">
                                    {Object.entries(teamColors).map(([name, color]) => (
                                        <div key={name} className="flex items-center space-x-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color as string }} />
                                            <span className="text-xs">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="w-full">
                            <Tabs defaultValue="week">
                                <div className="flex justify-center pb-2">
                                    <TabsList>
                                        <TabsTrigger value="month">Month View</TabsTrigger>
                                        <TabsTrigger value="week">Week View</TabsTrigger>
                                        <TabsTrigger value="list">List View</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="month" className="space-y-4">
                                    <div className="">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            className="rounded-md border w-full"
                                            modifiers={{
                                                hasEvents: calendarEvents.map((event: { date: string }) => new Date(event.date)),
                                            }}
                                            modifiersStyles={{
                                                hasEvents: {
                                                    fontWeight: "bold",
                                                    textDecoration: "underline",
                                                },
                                            }}
                                        />
                                    </div>

                                    {/* Events for selected date */}
                                    {selectedDate && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">
                                                Events for {selectedDate.toLocaleDateString()}
                                            </h4>
                                            {calendarEvents
                                                .filter((event: { date: string }) => event.date === selectedDate.toISOString().split("T")[0])
                                                .map((event: { date: string; title: string; type: string; color: string }, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center space-x-3 p-3 border rounded-lg"
                                                    >
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: event.color as string }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium">{event.title}</div>
                                                        </div>
                                                        {getEventBadge(event.type)}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="week">
                                    <div className="text-center py-8 text-muted-foreground">
                                        Week view implementation would go here
                                    </div>
                                </TabsContent>

                                <TabsContent value="list">
                                    <div className="space-y-3">
                                        {calendarEvents
                                            .sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map((event: { date: string; title: string; type: string; color: string }, index: number) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 border rounded-lg"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: event.color as string }}
                                                        />
                                                        <div>
                                                            <div className="font-medium">{event.title}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {new Date(event.date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {getEventBadge(event.type)}
                                                </div>
                                            ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>

                {/* Soon Expiring Tenders */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Soon Expiring Timers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="text-center py-8 text-muted-foreground">
                                Soon Expiring Timers of any step like Tender, RFQ, TQ, etc. implementation would go here
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
