import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class SubmitCostingSheetDto {
    @IsNumber()
    tenderId: number;

    @IsString()
    @IsNotEmpty()
    submittedFinalPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedReceiptPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedBudgetPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedGrossMargin: string;

    @IsString()
    @IsNotEmpty()
    teRemarks: string;
}

export class UpdateCostingSheetDto {
    @IsString()
    @IsNotEmpty()
    submittedFinalPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedReceiptPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedBudgetPrice: string;

    @IsString()
    @IsNotEmpty()
    submittedGrossMargin: string;

    @IsString()
    @IsNotEmpty()
    teRemarks: string;
}
