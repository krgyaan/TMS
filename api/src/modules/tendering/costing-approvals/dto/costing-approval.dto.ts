import { IsString, IsNotEmpty, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveCostingDto {
    @IsString()
    @IsNotEmpty()
    finalPrice: string;

    @IsString()
    @IsNotEmpty()
    receiptPrice: string;

    @IsString()
    @IsNotEmpty()
    budgetPrice: string;

    @IsString()
    @IsNotEmpty()
    grossMargin: string;

    @IsArray()
    @IsNumber({}, { each: true })
    @Type(() => Number)
    oemVendorIds: number[];

    @IsString()
    @IsNotEmpty()
    tlRemarks: string;
}

export class RejectCostingDto {
    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}

export class UpdateApprovedCostingDto {
    @IsString()
    @IsNotEmpty()
    finalPrice: string;

    @IsString()
    @IsNotEmpty()
    receiptPrice: string;

    @IsString()
    @IsNotEmpty()
    budgetPrice: string;

    @IsString()
    @IsNotEmpty()
    grossMargin: string;

    @IsArray()
    @IsNumber({}, { each: true })
    @Type(() => Number)
    oemVendorIds: number[];

    @IsString()
    @IsNotEmpty()
    tlRemarks: string;
}
