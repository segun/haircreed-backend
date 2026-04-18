import { IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  origin?: string;
}