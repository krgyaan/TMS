import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray } from 'class-validator';

export class ScheduleRaDto {
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

    @IsDateString()
    @IsOptional()
    raStartTime?: string;

    @IsDateString()
    @IsOptional()
    raEndTime?: string;
}

export class UploadRaResultDto {
    @IsString()
    @IsNotEmpty()
    raResult: 'Won' | 'Lost' | 'H1 Elimination';

    @IsString()
    @IsNotEmpty()
    veL1AtStart: 'Yes' | 'No';

    @IsString()
    @IsOptional()
    raStartPrice?: string;

    @IsString()
    @IsOptional()
    raClosePrice?: string;

    @IsDateString()
    @IsOptional()
    raCloseTime?: string;

    @IsString()
    @IsOptional()
    screenshotQualifiedParties?: string;

    @IsString()
    @IsOptional()
    screenshotDecrements?: string;

    @IsString()
    @IsOptional()
    finalResultScreenshot?: string;
}
