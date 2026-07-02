import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { getNotificationIcon } from "./ui-helpers";
import { staggerContainer, fadeInUp, tabContentVariants } from "../animations";

export const NotificationsSection: React.FC = () => {
  const { data } = useProfileContext();
  const NOTIFICATIONS = data?.notifications || [];
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

  return (
    <motion.div
      key="notifications"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div
          variants={fadeInUp}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold tracking-tight">
              All Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="h-6 text-[10px] bg-primary/10 text-primary font-bold rounded-lg"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 font-semibold text-primary"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-3">
          {notifications.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { delay: index * 0.06 },
              }}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer group",
                notif.read
                  ? "bg-background/80 hover:bg-muted/50 border-border/30"
                  : "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.07] shadow-sm"
              )}
              onClick={() =>
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === notif.id ? { ...n, read: true } : n
                  )
                )
              }
            >
              <div
                className={cn(
                  "mt-0.5 flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                  notif.type === "success" && "bg-emerald-500/10",
                  notif.type === "error" && "bg-destructive/10",
                  notif.type === "warning" && "bg-amber-500/10",
                  notif.type === "info" && "bg-primary/10"
                )}
              >
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm group-hover:text-primary transition-colors",
                      !notif.read ? "font-bold" : "font-medium"
                    )}
                  >
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium">
                  {notif.time}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
