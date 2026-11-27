import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { MasterWriteGuard } from "@/modules/master/common/master-write.guard";
import { ImprestCategoriesService } from "@/modules/master/imprest-categories/imprest-categories.service";

const CreateImprestCategorySchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    heading: z.string().max(100).optional(),
    status: z.boolean().optional().default(true),
    tallyLedgerId: z.number().int().positive().nullable().optional(),
    projectLedgerId: z.number().int().positive().nullable().optional(),
    businessDevelopmentLedgerId: z.number().int().positive().nullable().optional(),
    tallyBlocked: z.boolean().optional(),
});

const UpdateImprestCategorySchema = CreateImprestCategorySchema.partial();

@Controller("imprest-categories")
@UseGuards(MasterWriteGuard)
export class ImprestCategoriesController {
    constructor(private readonly imprestCategoriesService: ImprestCategoriesService) {}

    @Get()
    async list() {
        return this.imprestCategoriesService.findAll();
    }

    @Get("search")
    search(@Query("q") query: string) {
        if (!query) {
            return [];
        }

        return [];
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        const category = await this.imprestCategoriesService.findById(id);

        if (!category) {
            throw new NotFoundException(`Imprest Category with ID ${id} not found`);
        }

        return category;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateImprestCategorySchema.parse(body);

        return this.imprestCategoriesService.create(parsed);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateImprestCategorySchema.parse(body);

        return this.imprestCategoriesService.update(id, parsed);
    }
}
