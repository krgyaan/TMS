import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, FileText, GanttChart, Plus, Wallet, Truck, Package, Receipt, Banknote, ChevronRight, Send, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/app/routes/paths";

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
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 transition-transform">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
    </button>
);

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
