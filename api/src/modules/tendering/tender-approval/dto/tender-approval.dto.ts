import { IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IncompleteFieldDto {
    @IsString()
    fieldName: string;

    @IsString()
    comment: string;
}

export class TenderApprovalPayload {
    @IsEnum(['0', '1', '2', '3'], { message: 'tlStatus must be one of: 0, 1, 2, 3' })
    tlStatus: '0' | '1' | '2' | '3';

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    rfqTo?: number[];

    @IsOptional()
    @IsString()
    tenderFeeMode?: string;

    @IsOptional()
    @IsString()
    emdMode?: string;

    @IsOptional()
    @IsEnum(['1', '2'])
    approvePqrSelection?: '1' | '2';

    @IsOptional()
    @IsEnum(['1', '2'])
    approveFinanceDocSelection?: '1' | '2';

    @IsOptional()
    @IsNumber()
    tenderStatus?: number;

    @IsOptional()
    @IsString()
    oemNotAllowed?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    tlRejectionRemarks?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IncompleteFieldDto)
    incompleteFields?: IncompleteFieldDto[];
}
