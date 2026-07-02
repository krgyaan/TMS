import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { fadeInUp } from "../animations";

export const QuickInfo: React.FC = () => {
  const { data } = useProfileContext();
  if (!data) return null;
  const CURRENT_USER = data.currentUser || {} as any;
  const EMPLOYEE_PROFILE = data.employeeProfile || {} as any;
  const DOCUMENTS = data.documents || [];
  const ASSETS = data.assets || [];

  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-border/40 shadow-xl shadow-black/[0.03] bg-muted/20 backdrop-blur-sm hover:bg-muted/30 transition-all duration-500">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary">
              <Info className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold">
              Quick Info
            </span>
          </div>
          <div className="space-y-3.5">
            {[
              {
                label: "Probation",
                value: (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                  >
                    Completed
                  </Badge>
                ),
              },
              {
                label: "Salary Type",
                value: (
                  <span className="font-semibold text-sm">
                    {EMPLOYEE_PROFILE.salaryType || "-"}
                  </span>
                ),
              },
              {
                label: "Documents",
                value: (
                  <span className="font-semibold text-sm">
                    {DOCUMENTS.length} uploaded
                  </span>
                ),
              },
              {
                label: "Assets",
                value: (
                  <span className="font-semibold text-sm">
                    {ASSETS.length} assigned
                  </span>
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                {item.value}
              </div>
            ))}

            <Separator className="bg-border/30" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Last Login
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {formatDate(CURRENT_USER.lastLoginAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Member Since
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {formatDate(CURRENT_USER.createdAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
