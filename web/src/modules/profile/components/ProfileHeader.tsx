import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  BadgeCheck,
  Camera,
  Hash,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { getInitials } from "../utils";
import { scaleIn } from "../animations";

export const ProfileHeader: React.FC = () => {
  const { data } = useProfileContext();
  if (!data) return null;
  const CURRENT_USER = data.currentUser || {} as any;
  const PROFILE = data.profile || {} as any;
  const EMPLOYEE_PROFILE = data.employeeProfile || {} as any;

  return (
    <motion.div variants={scaleIn}>
      <Card className="border-none shadow-2xl shadow-primary/[0.06] overflow-hidden bg-muted/20 backdrop-blur-2xl hover:bg-muted/30 transition-all duration-500">
        {/* Gradient Cover */}
        <div className="h-28 sm:h-36 relative overflow-hidden">
          <div className="absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(var(--primary),0.2)_0%,_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(var(--primary),0.1)_0%,_transparent_50%)]" />
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="px-6 sm:px-10 pb-8 -mt-14 sm:-mt-16 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            {/* Avatar */}
            <div className="relative group">
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-2xl rounded-3xl relative">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl sm:text-3xl font-black bg-gradient-to-br from-primary/10 to-primary/30 text-primary rounded-3xl">
                  {getInitials(CURRENT_USER.name || "User")}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl shadow-xl border-2 border-background opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left pb-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {CURRENT_USER?.name || "Full Name"}
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />{" "}
                  {EMPLOYEE_PROFILE?.employeeStatus || "-"}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium mt-1.5 text-sm">
                {EMPLOYEE_PROFILE?.designation || "Designation"}
                <span className="mx-2.5 text-primary/20">•</span>
                {EMPLOYEE_PROFILE?.department || "Department"}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-5 mt-4">
                {[
                  { icon: Mail, val: CURRENT_USER.email || "-" },
                  { icon: Phone, val: CURRENT_USER.mobile || "-" },
                  {
                    icon: MapPin,
                    val: EMPLOYEE_PROFILE?.workLocation || "-",
                  },
                  { icon: Hash, val: PROFILE?.employeeCode || "-" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 hover:text-primary/80 transition-colors cursor-default"
                  >
                    <item.icon className="h-3.5 w-3.5 text-primary/50" />
                    <span
                      className={cn(
                        i === 3 && "font-mono tracking-wider"
                      )}
                    >
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-1">
              <Button className="rounded-2xl px-7 h-11 shadow-lg shadow-primary/20 font-bold transition-all active:scale-95 hover:shadow-xl hover:shadow-primary/30">
                <Pencil className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
