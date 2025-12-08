import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

export class UpdateInventoryItemDto {
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attributeIds?: string[];

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  origin?: string;
}