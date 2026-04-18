import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UseProductDto {
  @IsString()
  productId: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  origin?: string;
}