import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { EmdResponsibilityService } from "@/modules/master/emd-responsibilties/emd-responsibilties.service";

const CreateEmdResponsibilitySchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateEmdResponsibilitySchema = CreateEmdResponsibilitySchema.partial();

type CreateEmdResponsibilityDto = z.infer<typeof CreateEmdResponsibilitySchema>;
type UpdateEmdResponsibilityDto = z.infer<typeof UpdateEmdResponsibilitySchema>;

@Controller("emd-responsibilities")
export class EmdResponsibilityController {
    constructor(private readonly emdResponsibilityService: EmdResponsibilityService) {}

    @Get()
    async list() {
        console.log("Fetching all EMD Responsibilities FROM CONTROLLER");
        return this.emdResponsibilityService.findAll();
    }

    @Get("search")
    async search(@Query("q") query: string) {
        if (!query) {
            return [];
        }
        // return this.leadTypesService.search(query);
        return [];
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        const emdResponsibility = await this.emdResponsibilityService.findById(id);
        if (!emdResponsibility) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
        return emdResponsibility;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateEmdResponsibilitySchema.parse(body);
        return this.emdResponsibilityService.create(parsed);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateEmdResponsibilitySchema.parse(body);
        return this.emdResponsibilityService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.leadTypesService.delete(id);
    // }
}
