import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { EmployeeProfilesService } from "./employee-profiles.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";

const CreateEmployeeProfileSchema = z.object({
    userId: z.number(),
    employeeType: z.string().optional(),
    employeeStatus: z.string().optional(),
    workLocation: z.string().optional().nullable(),
    officialEmail: z.string().email().optional().nullable(),
    reportingManagerId: z.number().optional().nullable(),
    probationMonths: z.number().optional().nullable(),
    probationEndDate: z.coerce.date().optional().nullable(),
    salaryType: z.string().optional().nullable(),
    basicSalary: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    accountHolderName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    ifscCode: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    uanNumber: z.string().optional().nullable(),
    pfNumber: z.string().optional().nullable(),
    esicNumber: z.string().optional().nullable(),
    offerLetterDate: z.coerce.date().optional().nullable(),
    joiningLetterIssued: z.boolean().optional(),
    inductionCompleted: z.boolean().optional(),
    inductionDate: z.coerce.date().optional().nullable(),
    idCardIssued: z.boolean().optional(),
    idCardIssuedDate: z.coerce.date().optional().nullable(),
});

type CreateEmployeeProfileDto = z.infer<typeof CreateEmployeeProfileSchema>;

const UpdateEmployeeProfileSchema = CreateEmployeeProfileSchema.partial().omit({
    userId: true,
});

function toDateString(date?: Date | null): string | null {
    return date ? date.toISOString().split("T")[0] : null;
}

@Controller("employee-profiles")
@UseGuards(JwtAuthGuard)
export class EmployeeProfilesController {
    constructor(private readonly employeeProfilesService: EmployeeProfilesService) {}

    @Get()
    async list() {
        return this.employeeProfilesService.findAll();
    }

    @Post()
    async create(@Body() body: unknown) {
        const parsed = CreateEmployeeProfileSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            probationEndDate: toDateString(parsed.probationEndDate),
            offerLetterDate: toDateString(parsed.offerLetterDate),
            inductionDate: toDateString(parsed.inductionDate),
            idCardIssuedDate: toDateString(parsed.idCardIssuedDate),
        };
        
        return this.employeeProfilesService.create(cleanParsed as any);
    }

    @Get(":userId")
    async getByUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.employeeProfilesService.findByUserId(userId);
    }

    @Patch(":userId")
    async update(@Param("userId", ParseIntPipe) userId: number, @Body() body: unknown) {
        const parsed = UpdateEmployeeProfileSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            probationEndDate: toDateString(parsed.probationEndDate),
            offerLetterDate: toDateString(parsed.offerLetterDate),
            inductionDate: toDateString(parsed.inductionDate),
            idCardIssuedDate: toDateString(parsed.idCardIssuedDate),
        };

        return this.employeeProfilesService.updateByUserId(userId, cleanParsed as any);
    }
}
