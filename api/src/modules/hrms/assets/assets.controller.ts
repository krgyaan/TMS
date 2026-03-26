import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { z } from "zod";
import { AssetsService } from "./assets.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";

// Schema maps to NewEmployeeAsset (ignoring timestamps)
const BaseAssetSchema = z.object({
  userId: z.number(),
  assetCode: z.string(),
  assetType: z.string(),
  assetCategory: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  specifications: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  imeiNumber: z.string().optional().nullable(),
  licenseKey: z.string().optional().nullable(),
  assetValue: z.string().optional().nullable(),
  assetCondition: z.string().optional(),
  assignedDate: z.coerce.date(),
  assignedBy: z.number().optional().nullable(),
  expectedReturnDate: z.coerce.date().optional().nullable(),
  purpose: z.string().optional().nullable(),
  assetLocation: z.string().optional().nullable(),
  warrantyFrom: z.coerce.date().optional().nullable(),
  warrantyTo: z.coerce.date().optional().nullable(),
  insuranceDetails: z.string().optional().nullable(),
  accessories: z.array(z.any()).optional().nullable(),
  assetPhotos: z.array(z.string()).optional().nullable(),
  purchaseInvoiceUrl: z.string().optional().nullable(),
  warrantyCardUrl: z.string().optional().nullable(),
  assignmentFormUrl: z.string().optional().nullable(),
  assetStatus: z.string().optional(),
  returnDate: z.coerce.date().optional().nullable(),
  returnCondition: z.string().optional().nullable(),
  damageRemarks: z.string().optional().nullable(),
  deductionAmount: z.string().optional().nullable(),
});

type CreateAssetDto = z.infer<typeof BaseAssetSchema>;
const UpdateAssetSchema = BaseAssetSchema.partial();

function toDateString(date?: Date | null): string | null {
    return date ? date.toISOString().split("T")[0] : null;
}

import { AnyFilesInterceptor, FilesInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { UploadedFiles } from "@nestjs/common";

const multerConfig = {
    storage: diskStorage({
        destination: "./uploads/assets",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `asset-${uniqueSuffix}${ext}`);
        },
    }),
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
};

@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) {}

    @Get()
    async listAll() {
        return this.assetsService.findAll();
    }

    @Get("user/:userId")
    async listByUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.assetsService.findByUserId(userId);
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.assetsService.findById(id);
    }

    @Post()
    @UseInterceptors(AnyFilesInterceptor(multerConfig))
    async create(
        @Body() body: any, 
        @UploadedFiles() incomingFiles: Express.Multer.File[]
    ) {
        const files = incomingFiles || [];
        const assetPhotos = files.filter(f => f.fieldname === 'assetPhotos' || f.fieldname === 'assetPhotos[]').map(f => f.path);
        const purchaseInvoice = files.find(f => f.fieldname === 'purchaseInvoice' || f.fieldname === 'purchaseInvoice[]')?.path || null;
        const warrantyCard = files.find(f => f.fieldname === 'warrantyCard' || f.fieldname === 'warrantyCard[]')?.path || null;
        const assignmentForm = files.find(f => f.fieldname === 'assignmentForm' || f.fieldname === 'assignmentForm[]')?.path || null;
        // Zod parses stringified coercions properly (from FormData)
        // Adjust strings to numbers for validation if they come as formData strings
        if (typeof body.userId === "string") body.userId = parseInt(body.userId, 10);
        if (body.assignedBy && typeof body.assignedBy === "string") body.assignedBy = parseInt(body.assignedBy, 10);

        // Remove file fields from body to prevent Zod validation errors
        delete body.assetPhotos;
        delete body.purchaseInvoice;
        delete body.warrantyCard;
        delete body.assignmentForm;

        const parsed = BaseAssetSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            assignedDate: toDateString(parsed.assignedDate),
            expectedReturnDate: parsed.expectedReturnDate ? toDateString(parsed.expectedReturnDate) : null,
            warrantyFrom: parsed.warrantyFrom ? toDateString(parsed.warrantyFrom) : null,
            warrantyTo: parsed.warrantyTo ? toDateString(parsed.warrantyTo) : null,
            returnDate: parsed.returnDate ? toDateString(parsed.returnDate) : null,
            assetPhotos: assetPhotos,
            purchaseInvoiceUrl: purchaseInvoice,
            warrantyCardUrl: warrantyCard,
            assignmentFormUrl: assignmentForm,
        };
        
        return this.assetsService.create(cleanParsed as any);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateAssetSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            assignedDate: toDateString(parsed.assignedDate),
            expectedReturnDate: toDateString(parsed.expectedReturnDate),
            warrantyFrom: toDateString(parsed.warrantyFrom),
            warrantyTo: toDateString(parsed.warrantyTo),
            returnDate: toDateString(parsed.returnDate),
        };

        return this.assetsService.update(id, cleanParsed as any);
    }

    @Delete(":id")
    async delete(@Param("id", ParseIntPipe) id: number) {
        await this.assetsService.delete(id);
        return { success: true };
    }
}
