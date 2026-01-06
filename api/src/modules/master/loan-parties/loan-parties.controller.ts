import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { LoanPartiesService } from "@/modules/master/loan-parties/loan-parties.service";

const CreateLoanPartySchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateLoanPartySchema = CreateLoanPartySchema.partial();

type CreateLoanPartyDto = z.infer<typeof CreateLoanPartySchema>;
type UpdateLoanPartyDto = z.infer<typeof UpdateLoanPartySchema>;

@Controller("loan-parties")
export class LoanPartiesController {
    constructor(private readonly loanPartiesService: LoanPartiesService) {}

    @Get()
    async list() {
        console.log("Fetching all lead types");
        return this.loanPartiesService.findAll();
    }

    @Get("search")
    async search(@Query("q") query: string) {
        if (!query) {
            return [];
        }
        // return this.loanPartiesService.search(query);
        return [];
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        const leadType = await this.loanPartiesService.findById(id);
        if (!leadType) {
            throw new NotFoundException(`Lead Type with ID ${id} not found`);
        }
        return leadType;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateLoanPartySchema.parse(body);
        return this.loanPartiesService.create(parsed);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateLoanPartySchema.parse(body);
        return this.loanPartiesService.update(id, parsed);
    }
}
