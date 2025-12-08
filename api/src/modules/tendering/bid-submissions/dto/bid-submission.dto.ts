import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitBidDto {
    @IsNumber()
    tenderId: number;

    @IsDateString()
    @IsNotEmpty()
    submissionDatetime: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    submittedDocs: string[];

    @IsString()
    @IsNotEmpty()
    proofOfSubmission: string;

    @IsString()
    @IsNotEmpty()
    finalPriceSs: string;

    @IsString()
    @IsOptional()
    finalBiddingPrice: string | null;
}

export class MarkAsMissedDto {
    @IsNumber()
    tenderId: number;

    @IsString()
    @IsNotEmpty()
    reasonForMissing: string;

    @IsString()
    @IsNotEmpty()
    preventionMeasures: string;

    @IsString()
    @IsNotEmpty()
    tmsImprovements: string;
}

export class UpdateBidSubmissionDto {
    @IsDateString()
    @IsOptional()
    submissionDatetime?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    submittedDocs?: string[];

    @IsString()
    @IsOptional()
    proofOfSubmission?: string;

    @IsString()
    @IsOptional()
    finalPriceSs?: string;

    @IsString()
    @IsOptional()
    finalBiddingPrice?: string | null;

    @IsString()
    @IsOptional()
    reasonForMissing?: string;

    @IsString()
    @IsOptional()
    preventionMeasures?: string;

    @IsString()
    @IsOptional()
    tmsImprovements?: string;
}
