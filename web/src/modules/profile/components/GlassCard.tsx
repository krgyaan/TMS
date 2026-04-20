import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeInUp } from "../animations";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = true,
}) => (
  <motion.div variants={fadeInUp}>
    <Card
      className={cn(
        "border-border/40 bg-muted/20 backdrop-blur-xl overflow-hidden",
        hover &&
          "hover:shadow-2xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-500 ease-out",
        className
      )}
    >
      {children}
    </Card>
  </motion.div>
);
