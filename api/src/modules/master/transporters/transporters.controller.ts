import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { TransportersService } from "@/modules/master/transporters/transporters.service";

const CreateTransporterSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name cannot be longer than 255 characters"),
    gstNo: z.string().max(15).optional().nullable().transform((v) => v || null),
    phone: z.string().max(50).optional().nullable().transform((v) => v || null),
    address: z.string().optional().nullable().transform((v) => v || null),
    status: z.boolean().optional().default(true),
});

const UpdateTransporterSchema = CreateTransporterSchema.partial();

type CreateTransporterDto = z.infer<typeof CreateTransporterSchema>;
type UpdateTransporterDto = z.infer<typeof UpdateTransporterSchema>;

function parseIds(raw?: string): number[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
}

@Controller("transporters")
export class TransportersController {
    constructor(private readonly service: TransportersService) {}

    @Get()
    async list(@Query("q") q: string | undefined, @Query("ids") ids: string | undefined) {
        if (q !== undefined || ids !== undefined) {
            return this.service.search(q ?? "", parseIds(ids));
        }
        return this.service.findAll();
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateTransporterSchema.parse(body);
        const payload: CreateTransporterDto = { ...parsed, name: parsed.name.trim() };
        return this.service.create(payload);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateTransporterSchema.parse(body);
        const payload: UpdateTransporterDto = {
            ...parsed,
            name: parsed.name?.trim(),
        };
        return this.service.update(id, payload);
    }
}
