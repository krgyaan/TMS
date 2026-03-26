import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useUsers } from "@/hooks/api/useUsers";
import { useCreateHrmsEmployeeProfile } from "@/hooks/api/useHrmsEmployeeProfiles";
import { useUpdateUserProfile, useUserProfile } from "@/hooks/api/useUserProfiles";

const registrationSchema = z.object({
  // Mapping to userProfiles
  userId: z.number().positive("Base User is required"),
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.string().min(1, "Gender is required"),
  maritalStatus: z.string().min(1, "Marital Status is required"),
  nationality: z.string().min(1, "Nationality is required"),
  phone: z.string().min(1, "Phone / Mobile is required"),
  personalEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  aadharNumber: z.string().min(1, "Aadhar Number is required"),
  panNumber: z.string().min(1, "PAN Number is required"),
  
  // Mapping to employeeProfiles
  employeeType: z.string().default("full_time"),
  employeeStatus: z.string().default("active"),
  workLocation: z.string().min(1, "Work Location is required"),
  officialEmail: z.string().email("Valid official email required"),
  
  // Contact JSON mapping
  currentAddressLine1: z.string().min(1, "Address Line 1 is required"),
  currentCity: z.string().min(1, "City is required"),
  currentState: z.string().min(1, "State is required"),
  currentZip: z.string().min(1, "ZIP / Postal Code is required"),
  
  // Bank Information mapping
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branchName: z.string().optional(),
  
  // Compliance
  uanNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const EmployeeRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  
  const createEmployeeMutation = useCreateHrmsEmployeeProfile();
  const updateUserProfileMutation = useUpdateUserProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      employeeType: "full_time",
      employeeStatus: "active",
      gender: "Male"
    },
  });

  const selectedUserId = watch("userId");

  const isSubmitting = createEmployeeMutation.isPending || updateUserProfileMutation.isPending;

  const onSubmit = async (data: any) => {
    try {
      // 1. Update Core User Profile Space
      await updateUserProfileMutation.mutateAsync({
        userId: data.userId,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          maritalStatus: data.maritalStatus,
          nationality: data.nationality,
          phone: data.phone,
          altEmail: data.personalEmail,
          aadharNumber: data.aadharNumber,
          panNumber: data.panNumber,
          currentAddress: {
            line1: data.currentAddressLine1,
            city: data.currentCity,
            state: data.currentState,
            zip: data.currentZip
          }
        }
      });

      // 2. Create the HRMS Employee Profile row
      await createEmployeeMutation.mutateAsync({
        userId: data.userId,
        employeeType: data.employeeType,
        employeeStatus: data.employeeStatus,
        workLocation: data.workLocation,
        officialEmail: data.officialEmail,
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
        uanNumber: data.uanNumber,
        pfNumber: data.pfNumber,
        esicNumber: data.esicNumber,
      });

      navigate(`/hrms/employees/${data.userId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to register employee. Check console for details.");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/hrms")} className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
              </Button>
              <div>
                  <h1 className="text-2xl font-bold tracking-tight">Onboard Employee</h1>
                  <p className="text-muted-foreground">Register an existing workspace user as a formal employee</p>
              </div>
          </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Step 0: User Selection */}
        <Card>
          <CardHeader>
              <CardTitle>System Link</CardTitle>
              <CardDescription>Select the base workspace user account this HR profile belongs to.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
                <Label htmlFor="userId">Workspace User Account <span className="text-red-500">*</span></Label>
                <Select onValueChange={value => setValue("userId", Number(value))} disabled={isSubmitting || usersLoading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={usersLoading ? "Loading users..." : "Select existing user account"} />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map(u => (
                            <SelectItem key={u.id} value={String(u.id)}>
                                {u.name} ({u.email})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
            </div>
          </CardContent>
        </Card>

        {selectedUserId && (
          <>
            {/* Step 1: Personal Information */}
            <Card>
              <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Enter the employee's personal demographics and identifiers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                      <Input id="firstName" {...register("firstName")} disabled={isSubmitting} />
                      {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                      <Input id="lastName" {...register("lastName")} disabled={isSubmitting} />
                      {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                      <Input type="date" id="dateOfBirth" {...register("dateOfBirth")} disabled={isSubmitting} />
                      {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                      <Select defaultValue="Male" onValueChange={val => setValue("gender", val)} disabled={isSubmitting}>
                          <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="maritalStatus">Marital Status <span className="text-red-500">*</span></Label>
                      <Select onValueChange={val => setValue("maritalStatus", val)} disabled={isSubmitting}>
                          <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                          </SelectContent>
                      </Select>
                      {errors.maritalStatus && <p className="text-sm text-destructive">{errors.maritalStatus.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality <span className="text-red-500">*</span></Label>
                      <Input id="nationality" {...register("nationality")} disabled={isSubmitting} />
                      {errors.nationality && <p className="text-sm text-destructive">{errors.nationality.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="aadharNumber">Aadhar Number <span className="text-red-500">*</span></Label>
                      <Input id="aadharNumber" maxLength={12} {...register("aadharNumber")} disabled={isSubmitting} />
                      {errors.aadharNumber && <p className="text-sm text-destructive">{errors.aadharNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="panNumber">PAN Number <span className="text-red-500">*</span></Label>
                      <Input id="panNumber" maxLength={10} className="uppercase" {...register("panNumber")} disabled={isSubmitting} />
                      {errors.panNumber && <p className="text-sm text-destructive">{errors.panNumber.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Primary communication and address details.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="phone">Mobile Phone <span className="text-red-500">*</span></Label>
                      <Input id="phone" {...register("phone")} disabled={isSubmitting} />
                      {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="personalEmail">Alternate Personal Email</Label>
                      <Input id="personalEmail" type="email" {...register("personalEmail")} disabled={isSubmitting} />
                      {errors.personalEmail && <p className="text-sm text-destructive">{errors.personalEmail.message}</p>}
                  </div>
                </div>
                
                <h3 className="text-sm font-semibold mt-6 mb-4">Current Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-4 space-y-2">
                      <Label htmlFor="currentAddressLine1">Address Line 1 <span className="text-red-500">*</span></Label>
                      <Input id="currentAddressLine1" {...register("currentAddressLine1")} disabled={isSubmitting} />
                      {errors.currentAddressLine1 && <p className="text-sm text-destructive">{errors.currentAddressLine1.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="currentCity">City <span className="text-red-500">*</span></Label>
                      <Input id="currentCity" {...register("currentCity")} disabled={isSubmitting} />
                      {errors.currentCity && <p className="text-sm text-destructive">{errors.currentCity.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="currentState">State <span className="text-red-500">*</span></Label>
                      <Input id="currentState" {...register("currentState")} disabled={isSubmitting} />
                      {errors.currentState && <p className="text-sm text-destructive">{errors.currentState.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="currentZip">Postal Code <span className="text-red-500">*</span></Label>
                      <Input id="currentZip" {...register("currentZip")} disabled={isSubmitting} />
                      {errors.currentZip && <p className="text-sm text-destructive">{errors.currentZip.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Data */}
            <Card>
              <CardHeader>
                  <CardTitle>Internal Employment Data</CardTitle>
                  <CardDescription>Setup their employment nature and internal email.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="officialEmail">Official Workspace Email <span className="text-red-500">*</span></Label>
                      <Input id="officialEmail" type="email" {...register("officialEmail")} disabled={isSubmitting} />
                      {errors.officialEmail && <p className="text-sm text-destructive">{errors.officialEmail.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="workLocation">Work Location <span className="text-red-500">*</span></Label>
                      <Input id="workLocation" {...register("workLocation")} placeholder="HQ, Remote, Node A" disabled={isSubmitting} />
                      {errors.workLocation && <p className="text-sm text-destructive">{errors.workLocation.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="employeeType">Employment Type</Label>
                      <Select defaultValue="full_time" onValueChange={val => setValue("employeeType", val)} disabled={isSubmitting}>
                          <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="full_time">Full Time</SelectItem>
                              <SelectItem value="contract">Contractor</SelectItem>
                              <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Data */}
            <Card>
              <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <CardDescription>Setup their payroll banking information (Optional for now).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input id="bankName" {...register("bankName")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <Input id="accountHolderName" {...register("accountHolderName")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" {...register("accountNumber")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input id="ifscCode" className="uppercase" {...register("ifscCode")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="branchName">Branch Name</Label>
                      <Input id="branchName" {...register("branchName")} disabled={isSubmitting} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Data */}
            <Card>
              <CardHeader>
                  <CardTitle>Compliance Details</CardTitle>
                  <CardDescription>Corporate tracking numbers for taxes and benefits.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="uanNumber">UAN Number</Label>
                      <Input id="uanNumber" {...register("uanNumber")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pfNumber">Provident Fund (PF) No.</Label>
                      <Input id="pfNumber" {...register("pfNumber")} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="esicNumber">ESIC Number</Label>
                      <Input id="esicNumber" {...register("esicNumber")} disabled={isSubmitting} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/hrms")} disabled={isSubmitting}>
                  Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-48">
                  {isSubmitting ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                      </>
                  ) : (
                      "Complete Registration"
                  )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default EmployeeRegistration;
