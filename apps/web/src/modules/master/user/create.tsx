import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { DateInput } from "@/components/form/DateInput";
import { SelectField, type SelectOption } from "@/components/form/SelectField";
import FileUploadField from "@/components/form/FileUploadField";

// ---------------------------
// Schemas
// ---------------------------
const AccountSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    username: z.string().max(100),
    email: z.string().email({ message: "Invalid email" }),
    mobile: z.string().max(20),
    password: z.string().min(1, { message: "Password is required" }),
});

type AccountValues = z.infer<typeof AccountSchema>;

const ProfileSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    gender: z.string(),
    employeeCode: z.string(),
    designationId: z.string(),
    primaryTeamId: z.string(),
    altEmail: z.string().email({ message: "Invalid email" }).or(z.literal("")),
    emergencyContactName: z.string(),
    emergencyContactPhone: z.string(),
    image: z.string(),
    signature: z.string(),
    dateOfJoining: z.string(),
    dateOfExit: z.string(),
    timezone: z.string(),
    locale: z.string(),
});

type ProfileValues = z.infer<typeof ProfileSchema>;

// ---------------------------
// Helpers
// ---------------------------
async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
}

type User = { id: number; email: string; name?: string | null };
type Designation = { id: number; name: string };
type Team = { id: number; name: string };

export default function CreateUser() {
    const [userId, setUserId] = useState<number | null>(null);
    const [savingAccount, setSavingAccount] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [accountMsg, setAccountMsg] = useState<string>("");
    const [profileMsg, setProfileMsg] = useState<string>("");

    // Options
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        // Load options (best-effort)
        (async () => {
            try {
                const [d, t] = await Promise.all([
                    fetch("http://localhost:3000/api/v1/designations").then((r) => (r.ok ? r.json() : [])),
                    fetch("http://localhost:3000/api/v1/teams").then((r) => (r.ok ? r.json() : [])),
                ]);
                setDesignations(Array.isArray(d) ? d : []);
                setTeams(Array.isArray(t) ? t : []);
            } catch (_) {
                // ignore
            }
        })();
    }, []);

    const designationOptions: SelectOption[] = useMemo(
        () => [{ id: "", name: "Select Designation" }, ...designations.map((x) => ({ id: String(x.id), name: x.name }))],
        [designations]
    );
    const teamOptions: SelectOption[] = useMemo(
        () => [{ id: "", name: "Select Team" }, ...teams.map((x) => ({ id: String(x.id), name: x.name }))],
        [teams]
    );

    // ---------------------------
    // Account form
    // ---------------------------
    const accountForm = useForm<AccountValues>({
        resolver: zodResolver(AccountSchema),
        defaultValues: { name: "", username: "", email: "", mobile: "", password: "" },
    });

    const onSaveAccount: SubmitHandler<AccountValues> = async (values) => {
        setSavingAccount(true);
        setAccountMsg("");
        try {
            const emptyToUndef = (s: string) => (s && s.trim().length > 0 ? s : undefined);
            const payload = {
                name: values.name,
                username: emptyToUndef(values.username),
                email: values.email,
                mobile: emptyToUndef(values.mobile),
                password: values.password,
            };
            const u = await postJson<User>("http://localhost:3000/api/v1/users", payload);
            setUserId(u.id);
            setAccountMsg(`Account created. User ID: ${u.id}`);
        } catch (err: any) {
            setAccountMsg(err?.message || "Failed to save account");
        } finally {
            setSavingAccount(false);
        }
    };

    // ---------------------------
    // Profile form
    // ---------------------------
    const profileForm = useForm<ProfileValues>({
        resolver: zodResolver(ProfileSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            employeeCode: "",
            designationId: "",
            primaryTeamId: "",
            altEmail: "",
            emergencyContactName: "",
            emergencyContactPhone: "",
            image: "",
            signature: "",
            dateOfJoining: "",
            dateOfExit: "",
            timezone: "",
            locale: "",
        },
    });

    const onSaveProfile: SubmitHandler<ProfileValues> = async (values) => {
        if (!userId) {
            setProfileMsg("Create account first to get User ID");
            return;
        }
        setSavingProfile(true);
        setProfileMsg("");
        try {
            const emptyToUndef = (s: string) => (s && s.trim().length > 0 ? s : undefined);
            const payload = {
                userId,
                firstName: emptyToUndef(values.firstName),
                lastName: emptyToUndef(values.lastName),
                dateOfBirth: emptyToUndef(values.dateOfBirth),
                gender: emptyToUndef(values.gender),
                employeeCode: emptyToUndef(values.employeeCode),
                designationId: values.designationId ? Number(values.designationId) : undefined,
                primaryTeamId: values.primaryTeamId ? Number(values.primaryTeamId) : undefined,
                altEmail: emptyToUndef(values.altEmail),
                emergencyContactName: emptyToUndef(values.emergencyContactName),
                emergencyContactPhone: emptyToUndef(values.emergencyContactPhone),
                image: emptyToUndef(values.image),
                signature: emptyToUndef(values.signature),
                dateOfJoining: emptyToUndef(values.dateOfJoining),
                dateOfExit: emptyToUndef(values.dateOfExit),
                timezone: emptyToUndef(values.timezone),
                locale: emptyToUndef(values.locale),
            };
            await postJson("http://localhost:3000/api/v1/user-profiles", payload);
            setProfileMsg("Profile saved successfully");
        } catch (err: any) {
            setProfileMsg(err?.message || "Failed to save profile");
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create User - Account</CardTitle>
                    <CardAction>
                        {userId ? (
                            <span className="text-sm text-muted-foreground">Created ID: {userId}</span>
                        ) : null}
                    </CardAction>
                    <CardDescription>Basic credentials for the user account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...accountForm}>
                        <form onSubmit={accountForm.handleSubmit(onSaveAccount)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper<AccountValues, "name"> control={accountForm.control} name="name" label="Full Name">
                                    {(field) => <Input placeholder="John Doe" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<AccountValues, "username"> control={accountForm.control} name="username" label="Username">
                                    {(field) => <Input placeholder="johnd" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<AccountValues, "email"> control={accountForm.control} name="email" label="Email">
                                    {(field) => <Input placeholder="john@example.com" type="email" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<AccountValues, "mobile"> control={accountForm.control} name="mobile" label="Mobile">
                                    {(field) => <Input placeholder="+91 90000 00000" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<AccountValues, "password"> control={accountForm.control} name="password" label="Password">
                                    {(field) => <Input placeholder="••••••••" type="password" {...field} />}
                                </FieldWrapper>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <Button type="submit" disabled={savingAccount}>{savingAccount ? "Saving..." : "Save Account"}</Button>
                                <Button type="button" variant="outline" onClick={() => accountForm.reset()} disabled={savingAccount}>Reset</Button>
                            </div>
                            {accountMsg ? <p className="text-sm text-muted-foreground text-center">{accountMsg}</p> : null}
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Create User - Profile</CardTitle>
                    <CardDescription>Personal, employment and contact details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper<ProfileValues, "firstName"> control={profileForm.control} name="firstName" label="First Name">
                                    {(field) => <Input placeholder="John" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "lastName"> control={profileForm.control} name="lastName" label="Last Name">
                                    {(field) => <Input placeholder="Doe" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "dateOfBirth"> control={profileForm.control} name="dateOfBirth" label="Date of Birth">
                                    {(field) => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                                </FieldWrapper>

                                <SelectField<ProfileValues, "gender"> control={profileForm.control} name="gender" label="Gender" options={[
                                    { id: "", name: "Select Gender" },
                                    { id: "male", name: "Male" },
                                    { id: "female", name: "Female" },
                                    { id: "other", name: "Other" },
                                ].filter((o) => o.id)} placeholder="Select Gender" />

                                <FieldWrapper<ProfileValues, "employeeCode"> control={profileForm.control} name="employeeCode" label="Employee Code">
                                    {(field) => <Input placeholder="EMP-001" {...field} />}
                                </FieldWrapper>

                                <SelectField<ProfileValues, "designationId">
                                    control={profileForm.control}
                                    name="designationId"
                                    label="Designation"
                                    options={designationOptions.filter((o) => o.id)}
                                    placeholder="Select Designation"
                                />

                                <SelectField<ProfileValues, "primaryTeamId">
                                    control={profileForm.control}
                                    name="primaryTeamId"
                                    label="Primary Team"
                                    options={teamOptions.filter((o) => o.id)}
                                    placeholder="Select Team"
                                />

                                <FieldWrapper<ProfileValues, "altEmail"> control={profileForm.control} name="altEmail" label="Alternate Email">
                                    {(field) => <Input placeholder="john.alt@example.com" type="email" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "emergencyContactName"> control={profileForm.control} name="emergencyContactName" label="Emergency Contact Name">
                                    {(field) => <Input placeholder="Jane Doe" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "emergencyContactPhone"> control={profileForm.control} name="emergencyContactPhone" label="Emergency Contact Phone">
                                    {(field) => <Input placeholder="+91 90000 00000" {...field} />}
                                </FieldWrapper>

                                <FileUploadField<ProfileValues, "image">
                                    control={profileForm.control} name="image" label="Image URL"
                                    acceptedFileTypes={['image/*']}
                                />

                                <FileUploadField<ProfileValues, "signature">
                                    control={profileForm.control} name="signature" label="Signature URL"
                                    acceptedFileTypes={['image/*']}
                                />

                                <FieldWrapper<ProfileValues, "dateOfJoining"> control={profileForm.control} name="dateOfJoining" label="Date of Joining">
                                    {(field) => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "dateOfExit"> control={profileForm.control} name="dateOfExit" label="Date of Exit">
                                    {(field) => <DateInput value={field.value ?? ""} onChange={field.onChange} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "timezone"> control={profileForm.control} name="timezone" label="Timezone">
                                    {(field) => <Input placeholder="Asia/Kolkata" {...field} />}
                                </FieldWrapper>

                                <FieldWrapper<ProfileValues, "locale"> control={profileForm.control} name="locale" label="Locale">
                                    {(field) => <Input placeholder="en" {...field} />}
                                </FieldWrapper>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <Button type="submit" disabled={savingProfile || !userId}>{savingProfile ? "Saving..." : "Save Profile"}</Button>
                                <Button type="button" variant="outline" onClick={() => profileForm.reset()} disabled={savingProfile}>Reset</Button>
                            </div>
                            {profileMsg ? <p className="text-sm text-muted-foreground text-center">{profileMsg}</p> : null}
                            {!userId ? (
                                <p className="text-xs text-muted-foreground text-center">Save account first to enable profile save</p>
                            ) : null}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
