import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paths } from "@/app/routes/paths";
import { useProfile, useUpdateProfile } from "@/hooks/api/useOnboarding";
import { useRoles } from "@/hooks/api/useRoles";
import { useTeams } from "@/hooks/api/useTeams";
import { useUsers } from "@/hooks/api/useUsers";
import { useInductionTrackerList } from "@/hooks/api/useInduction";
import { addMonths, mapApiEmployee } from "./helpers/induction.helpers";

const EMPLOYEE_TYPE_OPTIONS = ["Full Time", "Part Time", "Intern", "Contract"];
const SALARY_TYPE_OPTIONS = ["Monthly", "Annual"];

interface WorkDetailsFormState {
  designationRoleId?: number;
  departmentTeamId?: number;
  reportingTl?: number;
  dateOfJoining: string;
  employeeType: string;
  workLocation: string;
  probationMonths: string;
  probationEndDate: string;
  salaryType: string;
  basicSalary: string;
  hra: string;
  allowances: string;
  bonus: string;
  pfApplicable: boolean;
  esicApplicable: boolean;
}

const EMPTY_FORM: WorkDetailsFormState = {
  designationRoleId: undefined,
  departmentTeamId: undefined,
  reportingTl: undefined,
  dateOfJoining: "",
  employeeType: "",
  workLocation: "",
  probationMonths: "",
  probationEndDate: "",
  salaryType: "",
  basicSalary: "",
  hra: "",
  allowances: "",
  bonus: "",
  pfApplicable: false,
  esicApplicable: false,
};

const InductionWorkDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onboardingId = Number(id);

  const { data: rawTracker } = useInductionTrackerList();
  const employee = useMemo(() => {
    if (!rawTracker) return null;
    const raw = rawTracker.find((r) => r.id === onboardingId);
    return raw ? mapApiEmployee(raw) : null;
  }, [rawTracker, onboardingId]);

  const { data: profile, isLoading: profileLoading } = useProfile(
    Number.isFinite(onboardingId) ? onboardingId : null
  );
  const { data: users = [] } = useUsers();
  const { data: roles = [] } = useRoles();
  const { data: teams = [] } = useTeams();
  const { mutate: saveProfile, isPending: saving } = useUpdateProfile(onboardingId);

  // Designation / Department are editable only when the candidate's Users record
  // does not have them yet (they are normally set on the Users page).
  const designationLocked = profile?.roleId != null;
  const departmentLocked = profile?.teamId != null;

  const [form, setForm] = useState<WorkDetailsFormState>(EMPTY_FORM);

  // Prefill once the profile (and users list for the TL id match) is available
  useEffect(() => {
    if (!profile) return;
    const tlUser =
      profile.reportingTl
        ? users.find((u) => u.name === profile.reportingTl)
        : undefined;
    setForm({
      designationRoleId: profile.roleId ?? undefined,
      departmentTeamId:
        profile.teamId ?? profile.departmentId ?? undefined,
      reportingTl: tlUser?.id,
      // Fall back to the tracker's date (which itself falls back to approvedAt),
      // matching what the dashboard column shows
      dateOfJoining:
        profile.dateOfJoining?.slice(0, 10) ||
        employee?.dateOfJoining?.slice(0, 10) ||
        "",
      employeeType: profile.employeeType ?? "",
      workLocation: profile.workLocation ?? "",
      probationMonths:
        profile.probationMonths != null ? String(profile.probationMonths) : "",
      probationEndDate: profile.probationEndDate?.slice(0, 10) ?? "",
      salaryType: profile.salaryType ?? "",
      basicSalary: profile.basicSalary ?? "",
      hra: profile.hra ?? "",
      allowances: profile.allowances ?? "",
      bonus: profile.bonus ?? "",
      pfApplicable: profile.pfApplicable ?? false,
      esicApplicable: profile.esicApplicable ?? false,
    });
  }, [profile, users, employee]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(paths.hrms.inductionDashboard);
  };

  const setField = <K extends keyof WorkDetailsFormState>(
    key: K,
    value: WorkDetailsFormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // Keep the current value selectable even when it's outside the standard options
  const employeeTypeOptions =
    form.employeeType && !EMPLOYEE_TYPE_OPTIONS.includes(form.employeeType)
      ? [form.employeeType, ...EMPLOYEE_TYPE_OPTIONS]
      : EMPLOYEE_TYPE_OPTIONS;
  const salaryTypeOptions =
    form.salaryType && !SALARY_TYPE_OPTIONS.includes(form.salaryType)
      ? [form.salaryType, ...SALARY_TYPE_OPTIONS]
      : SALARY_TYPE_OPTIONS;

  const handleSave = () => {
    saveProfile(
      {
        designationRoleId: designationLocked
          ? undefined
          : form.designationRoleId,
        departmentTeamId: departmentLocked
          ? undefined
          : form.departmentTeamId,
        departmentId: departmentLocked
          ? undefined
          : form.departmentTeamId,
        reportingTl: form.reportingTl,
        dateOfJoining: form.dateOfJoining || undefined,
        employeeType: form.employeeType || undefined,
        workLocation: form.workLocation || undefined,
        probationMonths: form.probationMonths
          ? Number(form.probationMonths)
          : undefined,
        probationEndDate: form.probationEndDate || undefined,
        salaryType: form.salaryType || undefined,
        basicSalary: form.basicSalary || undefined,
        hra: form.hra || undefined,
        allowances: form.allowances || undefined,
        bonus: form.bonus || undefined,
        pfApplicable: form.pfApplicable,
        esicApplicable: form.esicApplicable,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["onboarding", "induction-tracker"],
          });
          goBack();
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={goBack} className="rounded-xl gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">
                Work Details
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {employee
                  ? `${employee.firstName} ${employee.lastName} · ${employee.employeeId}`
                  : `Onboarding #${id}`}
              </p>
            </div>
          </div>

          {profileLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Work Information ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Work Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      Designation
                      {designationLocked && (
                        <span className="text-[9px] text-muted-foreground font-normal">
                          (set on Users page)
                        </span>
                      )}
                    </Label>
                    <Select
                      disabled={designationLocked}
                      value={form.designationRoleId ? String(form.designationRoleId) : undefined}
                      onValueChange={(v) => setField("designationRoleId", Number(v))}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                          .filter((r) => r.name)
                          .map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      Department
                      {departmentLocked && (
                        <span className="text-[9px] text-muted-foreground font-normal">
                          (set on Users page)
                        </span>
                      )}
                    </Label>
                    <Select
                      disabled={departmentLocked}
                      value={form.departmentTeamId ? String(form.departmentTeamId) : undefined}
                      onValueChange={(v) => setField("departmentTeamId", Number(v))}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams
                          .filter((t) => t.name)
                          .map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reporting TL</Label>
                    <Select
                      value={form.reportingTl ? String(form.reportingTl) : undefined}
                      onValueChange={(v) => setField("reportingTl", Number(v))}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select reporting TL" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.isActive)
                          .map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of Joining</Label>
                    <Input
                      type="date"
                      value={form.dateOfJoining}
                      onChange={(e) => {
                        const doj = e.target.value;
                        const next: Partial<WorkDetailsFormState> = { dateOfJoining: doj };
                        if (doj && form.probationMonths !== "") {
                          next.probationEndDate = addMonths(doj, Number(form.probationMonths));
                        }
                        setForm((prev) => ({ ...prev, ...next }));
                      }}
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Employee Type</Label>
                    <Select
                      value={form.employeeType || undefined}
                      onValueChange={(v) => setField("employeeType", v)}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select employee type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeTypeOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Work Location</Label>
                    <Input
                      value={form.workLocation}
                      onChange={(e) => setField("workLocation", e.target.value)}
                      placeholder="e.g. Bengaluru, Karnataka"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Probation Period (months)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.probationMonths}
                      onChange={(e) => {
                        const months = e.target.value;
                        const next: Partial<WorkDetailsFormState> = { probationMonths: months };
                        if (months !== "" && form.dateOfJoining) {
                          next.probationEndDate = addMonths(form.dateOfJoining, Number(months));
                        }
                        setForm((prev) => ({ ...prev, ...next }));
                      }}
                      placeholder="e.g. 6"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Probation End Date</Label>
                    <Input
                      type="date"
                      value={form.probationEndDate}
                      onChange={(e) => setField("probationEndDate", e.target.value)}
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* ── Compensation ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Compensation
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Salary Type</Label>
                    <Select
                      value={form.salaryType || undefined}
                      onValueChange={(v) => setField("salaryType", v)}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select salary type" />
                      </SelectTrigger>
                      <SelectContent>
                        {salaryTypeOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Basic Salary</Label>
                    <Input
                      value={form.basicSalary}
                      onChange={(e) => setField("basicSalary", e.target.value)}
                      placeholder="e.g. 45000"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">HRA</Label>
                    <Input
                      value={form.hra}
                      onChange={(e) => setField("hra", e.target.value)}
                      placeholder="e.g. 5000"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Allowances</Label>
                    <Input
                      value={form.allowances}
                      onChange={(e) => setField("allowances", e.target.value)}
                      placeholder="e.g. 3000"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Bonus</Label>
                    <Input
                      value={form.bonus}
                      onChange={(e) => setField("bonus", e.target.value)}
                      placeholder="e.g. 10000"
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">PF Applicable</Label>
                    <Select
                      value={form.pfApplicable ? "true" : "false"}
                      onValueChange={(v) => setField("pfApplicable", v === "true")}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">ESIC Applicable</Label>
                    <Select
                      value={form.esicApplicable ? "true" : "false"}
                      onValueChange={(v) => setField("esicApplicable", v === "true")}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-xl w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            <p className="text-xs text-muted-foreground">
              Saved details sync to the employee profile on approval
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                disabled={saving}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || profileLoading}
                className="rounded-xl"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InductionWorkDetailsPage;
