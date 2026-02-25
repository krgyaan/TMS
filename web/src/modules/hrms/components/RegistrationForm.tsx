import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeams } from "@/hooks/api/useTeams";
import { useDesignations } from "@/hooks/api/useDesignations";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { usersService } from "@/services/api/users.service";
import { toast } from "sonner";
import { getStoredUser, setStoredUser } from "@/lib/auth";

// Schema for registration form
const RegistrationSchema = z.object({
    // Personal Info
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    gender: z.string().min(1, "Gender is required"),
    maritalStatus: z.string().min(1, "Marital status is required"),
    nationality: z.string().min(1, "Nationality is required"),
    personalEmail: z.string().email("Invalid email"),
    phoneNumber: z.string().min(10, "Invalid phone number"),
    alternatePhone: z.string().optional(),
    aadharNumber: z.string().optional(),
    panNumber: z.string().optional(),

    // Addresses
    addresses: z.object({
        current: z.object({
            addressLine1: z.string().min(1, "Address is required"),
            addressLine2: z.string().optional(),
            city: z.string().min(1, "City is required"),
            state: z.string().min(1, "State is required"),
            country: z.string().min(1, "Country is required"),
            postalCode: z.string().min(1, "Postal code is required"),
        }),
        permanent: z.object({
            sameAsCurrent: z.boolean().default(true),
            addressLine1: z.string().optional(),
            addressLine2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
        }),
    }),

    // Bank Details
    bankDetails: z.object({
        bankName: z.string().min(1, "Bank name is required"),
        accountHolderName: z.string().min(1, "Account holder name is required"),
        accountNumber: z.string().min(1, "Account number is required"),
        ifscCode: z.string().min(1, "IFSC code is required"),
        branchName: z.string().optional(),
    }),

    // Emergency Contacts
    emergencyContacts: z.array(z.object({
        contactName: z.string().min(1, "Name is required"),
        relationship: z.string().min(1, "Relationship is required"),
        phoneNumber: z.string().min(1, "Phone number is required"),
    })).min(1, "At least one emergency contact is required"),

    // Employment
    designationId: z.string().optional(),
    primaryTeamId: z.string().optional(),
});

type RegistrationValues = z.infer<typeof RegistrationSchema>;

export const RegistrationForm = () => {
    const { data: teams = [] } = useTeams();
    const { data: designations = [] } = useDesignations();

    const form = useForm<RegistrationValues>({
        resolver: zodResolver(RegistrationSchema) as any,
        defaultValues: {
            firstName: "",
            middleName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            maritalStatus: "",
            nationality: "",
            personalEmail: "",
            phoneNumber: "",
            alternatePhone: "",
            aadharNumber: "",
            panNumber: "",
            emergencyContacts: [{ contactName: "", relationship: "", phoneNumber: "" }],
            addresses: {
                current: { addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "" },
                permanent: { sameAsCurrent: true, addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "" }
            },
            bankDetails: { bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "", branchName: "" },
            designationId: "",
            primaryTeamId: ""
        }
    });

    const navigate = useNavigate();

    const onSubmit = async (values: RegistrationValues) => {
        try {
            await usersService.register(values);
            toast.success("Account activated successfully!");

            // Update local user state to isActive: true
            const user = getStoredUser();
            if (user) {
                setStoredUser({ ...user, isActive: true });
            }

            // Redirect to dashboard
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Registration failed:", error);
            toast.error("Failed to complete registration. Please try again.");
        }
    };

    const isSameAsCurrent = form.watch("addresses.permanent.sameAsCurrent");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="emergency">Emergency</TabsTrigger>
                        <TabsTrigger value="bank">Bank</TabsTrigger>
                        <TabsTrigger value="employment">Employment</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="firstName" label="First Name">
                                {(field) => <Input placeholder="First Name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="middleName" label="Middle Name">
                                {(field) => <Input placeholder="Middle Name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="lastName" label="Last Name">
                                {(field) => <Input placeholder="Last Name" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="dateOfBirth" label="Date of Birth">
                                {(field) => <Input type="date" {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="gender"
                                label="Gender"
                                options={[{ id: "Male", name: "Male" }, { id: "Female", name: "Female" }, { id: "Other", name: "Other" }]}
                                placeholder="Select Gender"
                            />
                            <SelectField
                                control={form.control}
                                name="maritalStatus"
                                label="Marital Status"
                                options={[{ id: "Single", name: "Single" }, { id: "Married", name: "Married" }, { id: "Divorced", name: "Divorced" }, { id: "Widowed", name: "Widowed" }]}
                                placeholder="Select Status"
                            />

                            <FieldWrapper control={form.control} name="nationality" label="Nationality">
                                {(field) => <Input placeholder="e.g. Indian" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="personalEmail" label="Personal Email">
                                {(field) => <Input type="email" placeholder="personal@email.com" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="phoneNumber" label="Phone Number">
                                {(field) => <Input placeholder="+91 XXXXX XXXXX" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="alternatePhone" label="Alternate Phone">
                                {(field) => <Input placeholder="Optional" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="aadharNumber" label="Aadhar Number">
                                {(field) => <Input placeholder="12-digit number" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="panNumber" label="PAN Number">
                                {(field) => <Input placeholder="ABCDE1234F" {...field} />}
                            </FieldWrapper>
                        </div>
                    </TabsContent>

                    <TabsContent value="address" className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium border-b pb-2">Current Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldWrapper control={form.control} name="addresses.current.addressLine1" label="Address Line 1" className="md:col-span-2">
                                    {(field) => <Input placeholder="House No, Building, Street" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="addresses.current.addressLine2" label="Address Line 2 (Optional)" className="md:col-span-2">
                                    {(field) => <Input placeholder="Apartment, Suite, Unit" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="addresses.current.city" label="City">
                                    {(field) => <Input placeholder="City" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="addresses.current.state" label="State">
                                    {(field) => <Input placeholder="State" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="addresses.current.country" label="Country">
                                    {(field) => <Input placeholder="Country" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="addresses.current.postalCode" label="Postal Code">
                                    {(field) => <Input placeholder="Zip/Postal Code" {...field} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-sm font-medium">Permanent Address</h3>
                                <FormField
                                    control={form.control}
                                    name="addresses.permanent.sameAsCurrent"
                                    render={({ field }) => (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="same-as-current"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <label htmlFor="same-as-current" className="text-xs font-medium leading-none">
                                                Same as Current
                                            </label>
                                        </div>
                                    )}
                                />
                            </div>
                            {!isSameAsCurrent && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="addresses.permanent.addressLine1" label="Address Line 1" className="md:col-span-2">
                                        {(field) => <Input placeholder="House No, Building, Street" {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="addresses.permanent.addressLine2" label="Address Line 2 (Optional)" className="md:col-span-2">
                                        {(field) => <Input placeholder="Apartment, Suite, Unit" {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="addresses.permanent.city" label="City">
                                        {(field) => <Input placeholder="City" {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="addresses.permanent.state" label="State">
                                        {(field) => <Input placeholder="State" {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="addresses.permanent.country" label="Country">
                                        {(field) => <Input placeholder="Country" {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="addresses.permanent.postalCode" label="Postal Code">
                                        {(field) => <Input placeholder="Zip/Postal Code" {...field} />}
                                    </FieldWrapper>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="emergency" className="space-y-4 pt-4">
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium border-b pb-2">Emergency Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="emergencyContacts.0.contactName" label="Contact Name">
                                    {(field) => <Input placeholder="Name" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="emergencyContacts.0.relationship" label="Relationship">
                                    {(field) => <Input placeholder="e.g. Spouse, Parent" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="emergencyContacts.0.phoneNumber" label="Phone Number">
                                    {(field) => <Input placeholder="Phone Number" {...field} />}
                                </FieldWrapper>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="bank" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="bankDetails.bankName" label="Bank Name">
                                {(field) => <Input placeholder="Bank Name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bankDetails.accountHolderName" label="Account Holder Name">
                                {(field) => <Input placeholder="As per bank records" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bankDetails.accountNumber" label="Account Number">
                                {(field) => <Input placeholder="Account Number" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bankDetails.ifscCode" label="IFSC Code">
                                {(field) => <Input placeholder="IFSC Code" {...field} />}
                            </FieldWrapper>
                        </div>
                    </TabsContent>

                    <TabsContent value="employment" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField
                                control={form.control}
                                name="designationId"
                                label="Desired Designation"
                                options={designations.map(d => ({ id: String(d.id), name: d.name }))}
                                placeholder="Select Designation"
                            />
                            <SelectField
                                control={form.control}
                                name="primaryTeamId"
                                label="Preferred Team"
                                options={teams.map(t => ({ id: String(t.id), name: t.name }))}
                                placeholder="Select Team"
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-4">
                    <Button type="submit">Submit Registration</Button>
                </div>
            </form>
        </Form>
    );
};
