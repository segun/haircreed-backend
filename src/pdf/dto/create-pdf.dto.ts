import { IsString } from 'class-validator';

export class CreatePdfDto {
  @IsString()
  orderId: string;
}