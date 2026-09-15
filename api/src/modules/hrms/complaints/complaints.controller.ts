import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { ComplaintsService } from "./complaints.service";
import { CreateComplaintSchema, UpdateComplaintSchema, UpdateStatusSchema } from "./dto/Complaints.dto";

@Controller("hrms/complaints")
export class ComplaintsController {
    constructor(private readonly complaintsService: ComplaintsService) {}

    /**
     * GET /hrms/complaints
     * Complaints filed by the authenticated employee (support page list).
     */
    @Get()
    async getMyComplaints(@CurrentUser("id") userId: number) {
        return this.complaintsService.getMyComplaints(userId);
    }

    /**
     * GET /hrms/complaints/lookups
     * Active employees + departments for the complaint form selects.
     */
    @Get("lookups")
    async getLookups() {
        return this.complaintsService.getComplaintLookups();
    }

    /**
     * GET /hrms/complaints/all
     * Every complaint with filters, sorting and pagination (admin list).
     * No role restriction — any authenticated user may view all complaints.
     */
    @Get("all")
    async getAllComplaints(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("status") status?: string,
        @Query("priority") priority?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: string
    ) {
        return this.complaintsService.getAllComplaints({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search: search || undefined,
            status: status || undefined,
            priority: priority || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder === "asc" ? "asc" : sortOrder === "desc" ? "desc" : undefined,
        });
    }

    /**
     * POST /hrms/complaints
     * File a complaint as the authenticated employee.
     */
    @Post()
    async create(@CurrentUser("id") userId: number, @Body() body: unknown) {
        const dto = CreateComplaintSchema.parse(body);
        return this.complaintsService.createComplaint(userId, dto);
    }

    /**
     * GET /hrms/complaints/:id/detail
     * Single enriched complaint (view page).
     */
    @Get(":id/detail")
    async getComplaintById(@Param("id", ParseIntPipe) id: number) {
        return this.complaintsService.getComplaintById(id);
    }

    /**
     * PATCH /hrms/complaints/:id/status
     * HR/admin lifecycle update — moves a complaint between statuses
     * (open / in_progress / resolved / closed / rejected) with an optional
     * remark. Not restricted to the owner or to open complaints (unlike the
     * self-edit endpoints).
     */
    @Patch(":id/status")
    async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const dto = UpdateStatusSchema.parse(body);
        return this.complaintsService.updateComplaintStatus(id, dto);
    }

    /**
     * PATCH /hrms/complaints/:id
     * Edit a complaint — only while its status is still "open".
     */
    @Patch(":id")
    async update(@CurrentUser("id") userId: number, @Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const dto = UpdateComplaintSchema.parse(body);
        return this.complaintsService.updateMyComplaint(userId, id, dto);
    }

    /**
     * DELETE /hrms/complaints/:id
     * Delete a complaint — only while its status is still "open".
     */
    @Delete(":id")
    async remove(@CurrentUser("id") userId: number, @Param("id", ParseIntPipe) id: number) {
        return this.complaintsService.deleteMyComplaint(userId, id);
    }
}
