import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class UploadResultDto {
    @IsString()
    @IsNotEmpty()
    technicallyQualified: 'Yes' | 'No';

    @IsString()
    @IsOptional()
    disqualificationReason?: string;

    @IsString()
    @IsOptional()
    qualifiedPartiesCount?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    qualifiedPartiesNames?: string[];

    @IsString()
    @IsOptional()
    result?: 'Won' | 'Lost';

    @IsString()
    @IsOptional()
    l1Price?: string;

    @IsString()
    @IsOptional()
    l2Price?: string;

    @IsString()
    @IsOptional()
    ourPrice?: string;

    @IsString()
    @IsOptional()
    qualifiedPartiesScreenshot?: string;

    @IsString()
    @IsOptional()
    finalResultScreenshot?: string;
}
