import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateInventoryItemDto {
  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsArray()
  @IsString({ each: true })
  attributeIds: string[];
}