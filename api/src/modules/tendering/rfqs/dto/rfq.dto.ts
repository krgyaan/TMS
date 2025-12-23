import {
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
    Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class RfqItemDto {
    @IsString()
    @IsNotEmpty()
    requirement: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    unit?: string;

    @IsOptional()
    @IsNumber()
    qty?: number;
}

export class RfqDocumentDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    docType: string;

    @IsString()
    @IsNotEmpty()
    path: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class CreateRfqDto {
    @IsNumber()
    @IsNotEmpty()
    tenderId: number;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    docList?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    requestedVendor?: string;

    // Nested Items
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqItemDto)
    items: RfqItemDto[];

    // Nested Documents (Optional)
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqDocumentDto)
    documents?: RfqDocumentDto[];
}

export class UpdateRfqDto {
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    docList?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    requestedVendor?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqItemDto)
    items?: RfqItemDto[];

    // Nested Documents (Optional)
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqDocumentDto)
    documents?: RfqDocumentDto[];
}

export class RfqResponseItemDto {
    @IsString()
    @IsNotEmpty()
    requirement: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    unit?: string;

    @IsOptional()
    @IsNumber()
    qty?: number;

    @IsOptional()
    @IsNumber()
    unitPrice?: number;

    @IsOptional()
    @IsNumber()
    totalPrice?: number;
}

export class CreateRfqResponseDto {
    @IsNumber()
    @IsNotEmpty()
    rfqId: number;

    @IsNumber()
    @IsNotEmpty()
    vendorId: number;

    @IsDateString()
    @IsNotEmpty()
    receiptDatetime: string;

    @IsOptional()
    @IsNumber()
    gstPercentage?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    gstType?: string;

    @IsOptional()
    @IsNumber()
    deliveryTime?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    freightType?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqResponseItemDto)
    items: RfqResponseItemDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RfqDocumentDto)
    documents?: RfqDocumentDto[];
}

export class UpdateRfqResponseDto {
    @IsOptional()
    @IsDateString()
    receiptDatetime?: string;

    @IsOptional()
    @IsNumber()
    gstPercentage?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    gstType?: string;

    @IsOptional()
    @IsNumber()
    deliveryTime?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    freightType?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
