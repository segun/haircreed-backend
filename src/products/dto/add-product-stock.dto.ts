import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddProductStockDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  origin?: string;
}