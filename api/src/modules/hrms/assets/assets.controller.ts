// src/modules/hrms/assets/assets.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, UseInterceptors, UploadedFiles, Req } from "@nestjs/common";
import { z } from "zod";
import { AssetsService, StatusUpdateDto } from "./assets.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

// Schema for base asset creation
const optionalDate = z
  .string()
  .optional()
  .transform(val => (val === "" ? undefined : val))
  .pipe(z.coerce.date().optional());

const BaseAssetSchema = z.object({
  userId: z.coerce.number(),
  assetCode: z.string().optional().nullable(),
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
  assignedBy: z.coerce.number().optional().nullable(),
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
  returnDate: optionalDate,
  returnCondition: z.string().optional().nullable(),
  damageRemarks: z.string().optional().nullable(),
  deductionAmount: z.string().optional().nullable(),
  purchaseDate: optionalDate,
  purchasePrice: z.string().optional().nullable(),
  purchaseFrom: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const UpdateAssetSchema = BaseAssetSchema.partial();

// Schema for status updates
const StatusUpdateSchema = z.object({
  assetStatus: z.string(),
  
  // Assignment
  userId: z.coerce.number().optional(),
  assignedDate: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  
  // Return
  returnDate: z.string().optional(),
  returnCondition: z.string().optional(),
  
  // Damage
  damageDate: z.string().optional(),
  damageType: z.string().optional(),
  damageDescription: z.string().optional(),
  isRepairable: z.string().optional(),
  assetCondition: z.string().optional(),
  
  // Loss
  lostDate: z.string().optional(),
  lostLocation: z.string().optional(),
  lostCircumstances: z.string().optional(),
  policeReportNumber: z.string().optional(),
  policeReportDate: z.string().optional(),
  
  // Repair
  repairStartDate: z.string().optional(),
  repairEndDate: z.string().optional(),
  repairEstimatedCost: z.string().optional(),
  repairActualCost: z.string().optional(),
  repairVendor: z.string().optional(),
  repairDescription: z.string().optional(),
  
  // Financial
  deductionAmount: z.string().optional(),
  deductionReason: z.string().optional(),
  
  // General
  remarks: z.string().optional(),
});

function toDateString(date?: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

const multerConfig = {
  storage: diskStorage({
    destination: "./uploads/assets",
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `asset-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
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

  @Get(":id/details")
  async getByIdWithLabels(@Param("id", ParseIntPipe) id: number) {
    return this.assetsService.findByIdWithLabels(id);
  }

  @Get(":id/history")
  async getHistory(@Param("id", ParseIntPipe) id: number) {
    return this.assetsService.getAssetHistory(id);
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

    if (typeof body.userId === "string") body.userId = parseInt(body.userId, 10);
    if (typeof body.accessories === "string") {
      try {
        body.accessories = JSON.parse(body.accessories);
      } catch {
        body.accessories = [];
      }
    }

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
      purchaseDate: parsed.purchaseDate ? toDateString(parsed.purchaseDate) : null,
      assetPhotos,
      purchaseInvoiceUrl: purchaseInvoice,
      warrantyCardUrl: warrantyCard,
      assignmentFormUrl: assignmentForm,
    };

    return this.assetsService.create(cleanParsed as any);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const parsed = StatusUpdateSchema.parse(body);
    const data: StatusUpdateDto = {
      ...parsed,
      changedByUserId: req.user?.id,
    };
    return this.assetsService.updateStatus(id, data);
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