import { z } from "zod";

export const UserCreateFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(1, "Username is required"),
    mobile: z.string().min(1, "Mobile number is required").max(20, "Mobile number too long"),
    password: z.string().max(255).optional().refine(val => !val || val.length >= 6, {
        message: "Password must be at least 6 characters",
    }),
    teamId: z.string().min(1, "Team is required"),
    subTeamId: z.string().optional(),
    roleId: z.string().min(1, "Role is required"),
    isActive: z.boolean().default(true),
});

export type UserCreateFormValues = z.infer<typeof UserCreateFormSchema>;
