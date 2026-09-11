import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ComplaintsService } from './complaints.service';

const complaintBaseSchema = {
  complaintType: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  complaintAgainst: z.enum(['person', 'department', 'system', 'policy', 'facility']).optional(),
  complaintAgainstId: z.number().int().positive().optional().nullable(),
  incidentDate: z.string().optional(),
  incidentLocation: z.string().max(255).optional(),
  previousAttempts: z.string().max(10000).optional(),
  witnesses: z.string().max(10000).optional(),
  expectedResolution: z.string().max(10000).optional(),
  attachments: z.array(z.string()).max(10).default([]),
};

const CreateComplaintSchema = z.object(complaintBaseSchema);
const UpdateComplaintSchema = z.object(complaintBaseSchema).partial();

@Controller('hrms/complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  /**
   * GET /hrms/complaints
   * Complaints filed by the authenticated employee (support page list).
   */
  @Get()
  async getMyComplaints(@Req() req: any) {
    return this.complaintsService.getMyComplaints(req.user.id);
  }

  /**
   * GET /hrms/complaints/lookups
   * Active employees + departments for the complaint form selects.
   */
  @Get('lookups')
  async getLookups() {
    return this.complaintsService.getComplaintLookups();
  }

  /**
   * POST /hrms/complaints
   * File a complaint as the authenticated employee.
   */
  @Post()
  async create(@Req() req: any, @Body() body: unknown) {
    const dto = CreateComplaintSchema.parse(body);
    return this.complaintsService.createComplaint(req.user.id, dto);
  }

  /**
   * PATCH /hrms/complaints/:id
   * Edit a complaint — only while its status is still "open".
   */
  @Patch(':id')
  async update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const dto = UpdateComplaintSchema.parse(body);
    return this.complaintsService.updateMyComplaint(req.user.id, id, dto);
  }

  /**
   * DELETE /hrms/complaints/:id
   * Delete a complaint — only while its status is still "open".
   */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.complaintsService.deleteMyComplaint(req.user.id, id);
  }
}
