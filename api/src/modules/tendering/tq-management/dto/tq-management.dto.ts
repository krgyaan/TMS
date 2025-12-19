import { IsNumber, IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class TqItemDto {
    @IsNumber()
    tqTypeId: number;

    @IsString()
    @IsNotEmpty()
    queryDescription: string;
}

export class CreateTqReceivedDto {
    @IsNumber()
    tenderId: number;

    @IsDateString()
    @IsNotEmpty()
    tqSubmissionDeadline: string;

    @IsString()
    @IsOptional()
    tqDocumentReceived: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TqItemDto)
    tqItems: TqItemDto[];
}

export class UpdateTqRepliedDto {
    @IsDateString()
    @IsNotEmpty()
    repliedDatetime: string;

    @IsString()
    @IsOptional()
    repliedDocument: string | null;

    @IsString()
    @IsNotEmpty()
    proofOfSubmission: string;
}

export class UpdateTqMissedDto {
    @IsString()
    @IsNotEmpty()
    missedReason: string;

    @IsString()
    @IsNotEmpty()
    preventionMeasures: string;

    @IsString()
    @IsNotEmpty()
    tmsImprovements: string;
}

export class MarkAsNoTqDto {
    @IsNumber()
    tenderId: number;

    @IsBoolean()
    @IsOptional()
    qualified: boolean = true;
}

export class UpdateTqReceivedDto {
    @IsDateString()
    @IsNotEmpty()
    tqSubmissionDeadline: string;

    @IsString()
    @IsOptional()
    tqDocumentReceived: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TqItemDto)
    tqItems: TqItemDto[];
}

export class TqQualifiedDto {
    @IsBoolean()
    @IsOptional()
    qualified: boolean = true;
}
