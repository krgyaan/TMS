import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { fadeInUp } from "../animations";

export const ProfileCompletion: React.FC = () => {
  const { data } = useProfileContext();
  if (!data) return null;

  const { profile, employeeProfile, address, emergencyContact, documents } = data;

  const completedItems = [
    { label: "Basic Information", done: !!profile?.firstName },
    { label: "Address Details", done: !!address?.currentAddressLine1 },
    { label: "Emergency Contact", done: !!emergencyContact?.name },
    { label: "Identity Documents", done: documents?.length > 0 },
    { label: "Bank Details", done: !!employeeProfile?.bankName },
    { label: "Statutory Info", done: !!employeeProfile?.uanNumber },
    { label: "Work Details", done: !!employeeProfile?.designation },
  ];

  const completed = completedItems.filter((i) => i.done).length;
  const total = completedItems.length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-none shadow-2xl shadow-primary/10 bg-primary text-primary-foreground overflow-hidden relative group">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.08)_0%,_transparent_50%)]" />
        <motion.div
          className="absolute -right-8 -bottom-8 opacity-[0.07]"
          animate={{ rotate: [0, 5, 0, -5, 0] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <TrendingUp className="h-40 w-40" />
        </motion.div>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-bold">Profile Strength</span>
            </div>
            <span className="text-xs font-bold bg-primary-foreground/20 px-2.5 py-1 rounded-lg backdrop-blur-sm">
              {percentage === 100 ? "Complete" : `Level ${Math.floor(completed / 2) + 1}`}
            </span>
          </div>
          <p className="text-primary-foreground/60 text-[11px] mb-4">
            {percentage === 100 ? "Your profile is fully updated" : "Complete your profile information"}
          </p>

          <div className="flex items-end justify-between mb-3">
            <motion.span
              className="text-4xl font-black tracking-tight"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              {percentage}%
            </motion.span>
            <span className="text-xs font-medium text-primary-foreground/50 mb-1">
              {completed}/{total} completed
            </span>
          </div>
          <Progress
            value={percentage}
            className="h-2 bg-primary-foreground/15"
          />

          <Separator className="my-4 bg-primary-foreground/10" />

          <div className="space-y-2">
            {completedItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground/80" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30" />
                  )}
                  <span
                    className={cn(
                      item.done
                        ? "text-primary-foreground/50 line-through"
                        : "text-primary-foreground font-semibold"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                {!item.done && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[10px] px-2 bg-primary-foreground/15 text-primary-foreground border-0 hover:bg-primary-foreground/25"
                  >
                    Complete
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
