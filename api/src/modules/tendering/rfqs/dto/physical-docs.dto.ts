import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PhysicalDocPersonDto {
    @IsString()
    name?: string;

    @IsString()
    email?: string;

    @IsString()
    phone?: string;
}

export class CreatePhysicalDocDto {
    @IsNumber()
    tenderId?: string;

    @IsOptional()
    @IsNumber()
    courierNo?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    submittedDocs?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PhysicalDocPersonDto)
    persons?: PhysicalDocPersonDto[];

}

export class UpdatePhysicalDocDto {
    @IsOptional()
    @IsNumber()
    courierNo?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    submittedDocs?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PhysicalDocPersonDto)
    persons?: PhysicalDocPersonDto[];
}
