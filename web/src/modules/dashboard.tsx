import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Users, FileText, GanttChart } from "lucide-react";

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

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData);
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [currentTime, setCurrentTime] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

    const handleGoogleConnect = () => {
        // Implement Google OAuth connection
        console.log("Connect Google OAuth");
    };

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
            {/* Google OAuth Alert */}
            {!dashboardData.google_oauth_connected ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>Google OAuth Not Connected! Please connect your Google account now</span>
                        <Button variant="outline" size="sm" onClick={handleGoogleConnect}>
                            Connect Now
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="default">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>Google OAuth Connected! You are connected. You may reconnect if needed.</span>
                        <Button variant="outline" size="sm" onClick={handleGoogleConnect}>
                            Reconnect
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Employees - Only for Admin */}
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

                {/* Current Time - For non-admin */}
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

                {/* Total Tenders */}
                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{dashboardData.tenderInfoCount}</div>
                    </CardContent>
                </Card>

                {/* Total Bids */}
                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                        <GanttChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{dashboardData.bided}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Calendar Overview</CardTitle>
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
                                <span className="text-sm text-muted-foreground">Legendary:</span>
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
                        <Tabs defaultValue="month">
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
        </div>
    );
};

// Helper hook for useMemo
const useMemo = (callback: any, deps: any[]) => {
    const [value, setValue] = useState(callback());
    useEffect(() => {
        setValue(callback());
    }, deps);
    return value;
};

export default Dashboard;
