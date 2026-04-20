import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Shield,
  Briefcase,
  Heart,
  Globe,
  Sparkles,
  MapPinned,
  Clock,
  CheckCircle2,
  Pencil,
  CreditCard,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { InfoTile } from "./InfoTile";
import { SectionHeader } from "./SectionHeader";
import { GlassCard } from "./GlassCard";
import { ProfileCompletion } from "./ProfileCompletion";
import { QuickActions } from "./QuickActions";
import { QuickInfo } from "./QuickInfo";
import { PriorityAlerts } from "./PriorityAlerts";
import { tabContentVariants, staggerContainer } from "../animations";

interface OverviewTabProps {
  setActiveTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ setActiveTab }) => {
  const { data } = useProfileContext();
  if (!data) return null;
  
  const CURRENT_USER = data.currentUser || {} as any;
  const PROFILE = data.profile || {} as any;
  const EMPLOYEE_PROFILE = data.employeeProfile || {} as any;
  const ADDRESS = data.address || {} as any;
  const EMERGENCY_CONTACT = data.emergencyContact || {} as any;
  const NOTIFICATIONS = data.notifications || [];
  
  const unreadNotifCount = NOTIFICATIONS.filter((n: any) => !n.read).length;

  return (
    <motion.div
      key="overview"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Core Information */}
          <GlassCard>
            <div className="p-6">
              <SectionHeader
                icon={Sparkles}
                title="Core Information"
                subtitle="Personal & identity details"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-primary font-bold h-8 text-xs hover:bg-primary/10"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <InfoTile
                  icon={User}
                  label="Full Name"
                  value={PROFILE.firstName ? `${PROFILE.firstName} ${PROFILE.middleName || ""} ${PROFILE.lastName || ""}`.trim() : "-"}
                />
                <InfoTile
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDate(PROFILE.dateOfBirth)}
                />
                <InfoTile
                  icon={User}
                  label="Gender"
                  value={PROFILE.gender}
                />
                <InfoTile
                  icon={Heart}
                  label="Marital Status"
                  value={PROFILE.maritalStatus}
                />
                <InfoTile
                  icon={Globe}
                  label="Nationality"
                  value={PROFILE.nationality}
                />
                <InfoTile
                  icon={Mail}
                  label="Personal Email"
                  value={PROFILE.personalEmail}
                />
                <InfoTile
                  icon={Phone}
                  label="Phone"
                  value={PROFILE.phone}
                />
                <InfoTile
                  icon={Phone}
                  label="Alt. Phone"
                  value={PROFILE.alternatePhone}
                />
                <InfoTile
                  icon={Briefcase}
                  label="Employee ID"
                  value={PROFILE.employeeCode}
                  mono
                />
              </div>

              <Separator className="my-5 bg-border/30" />

              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Identity Documents
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile
                  icon={Shield}
                  label="Aadhar Number"
                  value={PROFILE.aadharNumber}
                  mono
                />
                <InfoTile
                  icon={Shield}
                  label="PAN Number"
                  value={PROFILE.panNumber}
                  mono
                />
              </div>
            </div>
          </GlassCard>

          {/* Employment & Payroll Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard>
              <div className="p-6">
                <SectionHeader
                  icon={Briefcase}
                  title="Work Details"
                  subtitle="Employment information"
                />
                <div className="space-y-3">
                  <InfoTile
                    icon={Briefcase}
                    label="Designation"
                    value={EMPLOYEE_PROFILE.designation}
                  />
                  <InfoTile
                    icon={Building2}
                    label="Department"
                    value={EMPLOYEE_PROFILE.department}
                  />
                  <InfoTile
                    icon={User}
                    label="Employment Type"
                    value={EMPLOYEE_PROFILE.employeeType}
                  />
                  <InfoTile
                    icon={MapPinned}
                    label="Office"
                    value={EMPLOYEE_PROFILE.workLocation}
                  />
                  <InfoTile
                    icon={User}
                    label="Reporting to"
                    value={EMPLOYEE_PROFILE.reportingManager}
                  />
                  <InfoTile
                    icon={Clock}
                    label="Join Date"
                    value={formatDate(EMPLOYEE_PROFILE.joiningDate)}
                  />
                </div>

                <Separator className="my-4 bg-border/30" />

                <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 mb-3">
                  Onboarding
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Offer Letter",
                      done: !!EMPLOYEE_PROFILE?.offerLetterDate,
                    },
                    {
                      label: "Joining",
                      done: !!EMPLOYEE_PROFILE?.joiningLetterIssued,
                    },
                    {
                      label: "Induction",
                      done: !!EMPLOYEE_PROFILE?.inductionCompleted,
                    },
                    {
                      label: "ID Card",
                      done: !!EMPLOYEE_PROFILE?.idCardIssued,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider",
                        item.done
                          ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-600"
                          : "bg-muted/30 border-border/30 text-muted-foreground"
                      )}
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-6">
                <SectionHeader
                  icon={CreditCard}
                  title="Payroll & Banking"
                  subtitle="Financial details"
                />
                <div className="space-y-3">
                  <InfoTile
                    icon={Building2}
                    label="Bank"
                    value={EMPLOYEE_PROFILE.bankName}
                  />
                  <InfoTile
                    icon={User}
                    label="Account Holder"
                    value={EMPLOYEE_PROFILE.accountHolderName}
                  />
                  <InfoTile
                    icon={Hash}
                    label="Account"
                    value={EMPLOYEE_PROFILE.accountNumber}
                    mono
                  />
                  <InfoTile
                    icon={Hash}
                    label="IFSC"
                    value={EMPLOYEE_PROFILE.ifscCode}
                    mono
                  />
                  <InfoTile
                    icon={MapPinned}
                    label="Branch"
                    value={EMPLOYEE_PROFILE.branchName}
                  />
                </div>

                <Separator className="my-4 bg-border/30" />

                <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 mb-3">
                  Statutory
                </p>
                <div className="space-y-3">
                  <InfoTile
                    icon={Shield}
                    label="UAN"
                    value={EMPLOYEE_PROFILE.uanNumber}
                    mono
                  />
                  <InfoTile
                    icon={Hash}
                    label="PF Number"
                    value={EMPLOYEE_PROFILE.pfNumber}
                    mono
                  />
                  <InfoTile
                    icon={Hash}
                    label="ESIC"
                    value={EMPLOYEE_PROFILE.esicNumber}
                    mono
                  />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Address */}
          <GlassCard>
            <div className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                <MapPin className="h-28 w-28" />
              </div>
              <SectionHeader
                icon={MapPin}
                title="Address Details"
                subtitle="Residential information"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-primary font-bold h-8 text-xs hover:bg-primary/10"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 hover:border-primary/20 transition-colors">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-3 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Current Residence
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {ADDRESS.currentAddressLine1 || "-"}
                    </p>
                    {ADDRESS.currentAddressLine2 && (
                      <p className="text-sm text-muted-foreground">
                        {ADDRESS.currentAddressLine2}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {ADDRESS.currentCity || "-"}, {ADDRESS.currentState || "-"}{" "}
                      {ADDRESS.currentPostalCode || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ADDRESS.currentCountry || "-"}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 hover:border-border transition-colors">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Permanent
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {ADDRESS.permanentAddressLine1 || "-"}
                    </p>
                    {ADDRESS.permanentAddressLine2 && (
                      <p className="text-sm text-muted-foreground">
                        {ADDRESS.permanentAddressLine2}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {ADDRESS.permanentCity || "-"}, {ADDRESS.permanentState || "-"}{" "}
                      {ADDRESS.permanentPostalCode || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ADDRESS.permanentCountry || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Emergency Contact */}
          <GlassCard>
            <div className="p-6">
              <SectionHeader
                icon={Heart}
                title="Emergency Contact"
                subtitle="In case of emergency"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-primary font-bold h-8 text-xs hover:bg-primary/10"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <InfoTile
                  icon={User}
                  label="Contact Name"
                  value={EMERGENCY_CONTACT.name}
                />
                <InfoTile
                  icon={Heart}
                  label="Relationship"
                  value={EMERGENCY_CONTACT.relationship}
                />
                <InfoTile
                  icon={Phone}
                  label="Phone"
                  value={EMERGENCY_CONTACT.phone}
                />
                <InfoTile
                  icon={Phone}
                  label="Alt. Phone"
                  value={EMERGENCY_CONTACT.altPhone}
                />
                <InfoTile
                  icon={Mail}
                  label="Email"
                  value={EMERGENCY_CONTACT.email}
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Right Column: Insights */}
      <div className="space-y-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Profile Completion */}
          <ProfileCompletion />

          {/* Quick Actions */}
          <QuickActions setActiveTab={setActiveTab} />

          {/* Quick Info */}
          <QuickInfo />

          {/* Priority Alerts */}
          <PriorityAlerts
            setActiveTab={setActiveTab}
            unreadCount={unreadNotifCount}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
