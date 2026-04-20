import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { staggerContainer, fadeInUp, tabContentVariants } from "../animations";

export const ComplaintsSection: React.FC = () => {
  const { data } = useProfileContext();
  if (!data) return null;
  const COMPLAINTS = data?.complaints || [];

  return (
    <motion.div
      key="complaints"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {COMPLAINTS.map((c, index) => {
        const statusColor =
          c.status === "resolved"
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            : c.status === "in_progress"
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : "bg-muted text-muted-foreground border-border";

        const priorityColor =
          c.priority === "high"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground";

        return (
          <motion.div
            key={c.id}
            variants={fadeInUp}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/40 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-400 group bg-muted/20 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <MessageSquare className="h-5 w-5 text-primary/60 group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">
                        {c.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold">
                          {c.complaintCode}
                        </span>
                        <span className="text-primary/20">•</span>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-6 font-bold rounded-lg capitalize",
                        statusColor
                      )}
                    >
                      {c.status.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5 font-bold rounded-md capitalize border-0",
                        priorityColor
                      )}
                    >
                      {c.priority}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <motion.div variants={fadeInUp}>
        <Button
          variant="outline"
          className="w-full gap-2 h-12 rounded-2xl border-dashed border-2 hover:border-primary/30 hover:bg-primary/5 transition-all font-bold"
        >
          <MessageSquare className="h-4 w-4" />
          Raise a Complaint
        </Button>
      </motion.div>
      </motion.div>
    </motion.div>
  );
};
