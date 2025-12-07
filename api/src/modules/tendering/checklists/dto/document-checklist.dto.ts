import { IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ExtraDocumentDto {
    @IsOptional()
    name?: string;

    @IsOptional()
    path?: string;
}

export class CreateDocumentChecklistDto {
    @IsNumber()
    tenderId: number;

    @IsOptional()
    @IsArray()
    selectedDocuments?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExtraDocumentDto)
    extraDocuments?: ExtraDocumentDto[];
}

export class UpdateDocumentChecklistDto {
    @IsOptional()
    @IsArray()
    selectedDocuments?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExtraDocumentDto)
    extraDocuments?: ExtraDocumentDto[];
}
