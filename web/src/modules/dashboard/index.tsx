import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularsWidget } from "./components/CircularsWidget";
import { QuickActionCard } from "./components/QuickActionCard";
import { SoonExpiringTimers } from "./components/SoonExpiringTimers";
import { mockDashboardData, mockUsers, quickActions } from "./helpers/dashboard.constants";

const Dashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(mockDashboardData);
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const {teamId, isSuperUser, isAdmin} = useAuth();

    const isTenderingTeam = teamId == 1 || teamId == 2 || isSuperUser || isAdmin;

    // Update current time
    useEffect(() => {
        setDashboardData(mockDashboardData);
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

    return (
        <div className="space-y-6 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {/* Quick Actions */}
                <div className="col-span-1 md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {quickActions
                            .filter(action => action.title !== "New Tender" || isTenderingTeam)
                            .map((action) => (
                            <QuickActionCard
                                key={action.title}
                                {...action}
                                onClick={() => action?.path && navigate(action.path)}
                            />
                        ))}
                    </div>
                </div>
                {/* Notice Board & Circulars Section */}
                <div className="col-span-1 md:col-span-1">
                    <CircularsWidget />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {/* Calendar Section */}
                <Card className="col-span-1 md:col-span-2">
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
                                </TabsContent>

                                <TabsContent value="week">
                                    <div className="text-center py-8 text-muted-foreground">
                                        Week view implementation would go here
                                    </div>
                                </TabsContent>

                                <TabsContent value="list">
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>

                {/* Soon Expiring Timers */}
                <div className="col-span-1 md:col-span-1">
                    <SoonExpiringTimers />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;