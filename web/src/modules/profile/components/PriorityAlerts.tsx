import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { getNotificationIcon } from "./ui-helpers";
import { fadeInUp } from "../animations";

export const PriorityAlerts: React.FC<{ setActiveTab: (t: string) => void, unreadCount: number }> = ({ setActiveTab, unreadCount }) => {
  const { data } = useProfileContext();
  if (!data) return null;
  const NOTIFICATIONS = data.notifications || [];

  const alerts = NOTIFICATIONS.filter((n) => n.type === "warning" || n.type === "error").slice(0, 2);

  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-border/40 shadow-xl shadow-black/[0.03] bg-muted/20 backdrop-blur-sm hover:bg-muted/30 transition-all duration-500">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">
                Priority Alerts
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <motion.div
                  className="h-2.5 w-2.5 rounded-full bg-destructive"
                  animate={{
                    scale: [1, 1.4, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold text-primary"
                onClick={() =>
                  setActiveTab("notifications")
                }
              >
                View all
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {NOTIFICATIONS.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 group cursor-pointer p-2.5 rounded-xl transition-colors",
                  !n.read
                    ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setActiveTab("notifications")}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    n.type === "error" && "bg-destructive/10",
                    n.type === "success" && "bg-emerald-500/10",
                    n.type === "warning" && "bg-amber-500/10",
                    n.type === "info" && "bg-primary/10"
                  )}
                >
                  {getNotificationIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-xs truncate group-hover:text-primary transition-colors",
                      !n.read ? "font-bold" : "font-medium"
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5">
                    {n.message}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
