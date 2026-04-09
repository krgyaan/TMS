// src/modules/hrms/assets/assets.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, UseInterceptors, UploadedFiles, Req } from "@nestjs/common";
import { z } from "zod";
import { AssetsService, StatusUpdateDto } from "./assets.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";

const ASSET_UPLOAD_DIR = "uploads/hrms/assets";

const emptyToNull = (val: any) => val === "" ? null : val;

// Schema for base asset creation
const optionalDate = z
  .string()
  .optional()
  .transform(val => (val === "" ? undefined : val))
  .pipe(z.coerce.date().optional());

const BaseAssetSchema = z.object({
  userId: z.coerce.number().optional(),
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
  assignedDate: z.coerce.date().optional(),
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
  userId: z.coerce.number().optional().nullable(),
  assignedDate: z.string().optional().nullable().transform(emptyToNull),
  expectedReturnDate: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  assetLocation: z.string().optional().nullable(),
  
  // Return
  returnDate: z.string().optional().nullable().transform(emptyToNull),
  returnCondition: z.string().optional().nullable(),
  
  // Damage
  damageDate: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  damageDescription: z.string().optional().nullable(),
  isRepairable: z.string().optional().nullable(),
  assetCondition: z.string().optional().nullable(),
  
  // Loss
  lostDate: z.string().optional().nullable(),
  lostLocation: z.string().optional().nullable(),
  lostCircumstances: z.string().optional().nullable(),
  policeReportNumber: z.string().optional().nullable(),
  policeReportDate: z.string().optional().nullable(),
  
  // Repair
  repairStartDate: z.string().optional().nullable(),
  repairEndDate: z.string().optional().nullable().transform(emptyToNull),
  repairEstimatedCost: z.string().optional().nullable(),
  repairActualCost: z.string().optional().nullable(),
  repairVendor: z.string().optional().nullable(),
  repairDescription: z.string().optional().nullable(),
  
  // Financial
  deductionAmount: z.string().optional().nullable(),
  deductionReason: z.string().optional().nullable(),
  
  // General
  remarks: z.string().optional().nullable(),
});

function toDateString(date?: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

const multerConfig = {
  storage: diskStorage({
    destination: "./uploads/hrms/assets",
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
    const assetPhotos = files.filter(f => f.fieldname === 'assetPhotos' || f.fieldname === 'assetPhotos[]').map(f => f.filename);
    const purchaseInvoice = files.find(f => f.fieldname === 'purchaseInvoice' || f.fieldname === 'purchaseInvoice[]')?.filename || null;
    const warrantyCard = files.find(f => f.fieldname === 'warrantyCard' || f.fieldname === 'warrantyCard[]')?.filename || null;
    const assignmentForm = files.find(f => f.fieldname === 'assignmentForm' || f.fieldname === 'assignmentForm[]')?.filename || null;

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
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFiles() incomingFiles: Express.Multer.File[]
  ) {
    const files = incomingFiles || [];

    if (typeof body.accessories === "string") {
      try {
        body.accessories = JSON.parse(body.accessories);
      } catch {
        body.accessories = [];
      }
    }

    // 🔹 Extract uploaded files (store filename only, like courier module)
    const newPhotos = files
      .filter((f) => f.fieldname === "assetPhotos")
      .map((f) => f.filename);

    const newPurchaseInvoice =
      files.find((f) => f.fieldname === "purchaseInvoice")?.filename || null;

    const newWarrantyCard =
      files.find((f) => f.fieldname === "warrantyCard")?.filename || null;

    const newAssignmentForm =
      files.find((f) => f.fieldname === "assignmentForm")?.filename || null;

    // 🔹 Parse removed files
    let removedFiles: string[] = [];
    if (body.removedFiles) {
      try {
        removedFiles = JSON.parse(body.removedFiles);
      } catch {
        removedFiles = [];
      }
    }

    // 🔹 Get existing asset
    const existing = await this.assetsService.findById(id);
    if (!existing) {
      throw new Error("Asset not found");
    }

    // 🔹 Remove physical files
    const DOC_KEYS = ["purchaseInvoice", "warrantyCard", "assignmentForm"];

    // Helper: resolve stored filename/path to full disk path
    const toDiskPath = (storedValue: string) => {
      // Legacy records stored full relative path (e.g. "uploads/hrms/assets/...") 
      if (storedValue.startsWith("uploads/")) return storedValue;
      // New records store filename only
      return join(ASSET_UPLOAD_DIR, storedValue);
    };

    const filesToDelete: string[] = [];

    // Map abstract document keys to their stored value then to disk path
    if (removedFiles.includes("purchaseInvoice") && existing.purchaseInvoiceUrl) {
      filesToDelete.push(toDiskPath(existing.purchaseInvoiceUrl));
    }
    if (removedFiles.includes("warrantyCard") && existing.warrantyCardUrl) {
      filesToDelete.push(toDiskPath(existing.warrantyCardUrl));
    }
    if (removedFiles.includes("assignmentForm") && existing.assignmentFormUrl) {
      filesToDelete.push(toDiskPath(existing.assignmentFormUrl));
    }

    // Any entry that is NOT a doc key is treated as a photo filename
    removedFiles.forEach(entry => {
      if (!DOC_KEYS.includes(entry)) {
        filesToDelete.push(toDiskPath(entry));
      }
    });

    filesToDelete.forEach((diskPath) => {
      try {
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (e) {
        console.error("Failed to delete asset file:", diskPath, e);
      }
    });

    // 🔹 Merge photos
    const currentPhotos = (existing.assetPhotos as string[]) || [];
    const updatedPhotos = [
      ...currentPhotos.filter(
        (p: string) => !removedFiles.includes(p)
      ),
      ...newPhotos,
    ];

    // 🔹 Merge documents
    const updatedData = {
      ...body,

      assetPhotos: updatedPhotos,

      purchaseInvoiceUrl: removedFiles.includes("purchaseInvoice")
        ? null
        : newPurchaseInvoice || existing.purchaseInvoiceUrl,

      warrantyCardUrl: removedFiles.includes("warrantyCard")
        ? null
        : newWarrantyCard || existing.warrantyCardUrl,

      assignmentFormUrl: removedFiles.includes("assignmentForm")
        ? null
        : newAssignmentForm || existing.assignmentFormUrl,
    };

    delete updatedData.removedFiles;

    const parsed = UpdateAssetSchema.parse(updatedData);

    const cleanParsed = {
      ...parsed,
      assignedDate: toDateString(parsed.assignedDate),
      expectedReturnDate: parsed.expectedReturnDate ? toDateString(parsed.expectedReturnDate) : null,
      warrantyFrom: parsed.warrantyFrom ? toDateString(parsed.warrantyFrom) : null,
      warrantyTo: parsed.warrantyTo ? toDateString(parsed.warrantyTo) : null,
      returnDate: parsed.returnDate ? toDateString(parsed.returnDate) : null,
      purchaseDate: parsed.purchaseDate ? toDateString(parsed.purchaseDate) : null,
    };

    return this.assetsService.update(id, cleanParsed as any);
  }

  @Delete(":id")
  async delete(@Param("id", ParseIntPipe) id: number) {
    await this.assetsService.delete(id);
    return { success: true };
  }
}