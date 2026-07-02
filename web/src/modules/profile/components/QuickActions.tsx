import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Laptop,
  MessageSquare,
  Zap,
} from "lucide-react";
import { fadeInUp } from "../animations";

interface QuickActionsProps {
  setActiveTab: (tab: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ setActiveTab }) => {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-border/40 shadow-xl shadow-black/[0.03] bg-muted/20 backdrop-blur-sm hover:bg-muted/30 transition-all duration-500">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">
              Quick Actions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Upload",
                icon: Upload,
                tab: "documents",
              },
              {
                label: "Reports",
                icon: FileText,
                tab: null,
              },
              {
                label: "Assets",
                icon: Laptop,
                tab: "assets",
              },
              {
                label: "Tickets",
                icon: MessageSquare,
                tab: "complaints",
              },
            ].map((act) => (
              <motion.button
                key={act.label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/20 hover:bg-primary/5 border border-transparent hover:border-primary/15 transition-all group cursor-pointer"
                onClick={() =>
                  act.tab &&
                  setActiveTab(act.tab)
                }
              >
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <act.icon className="h-5 w-5 text-primary/60 group-hover:text-primary-foreground transition-colors" />
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                  {act.label}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
