import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class ReceiptLineItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  description: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  quantity: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  amount: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  discount: number;
}

export class SendReceiptDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  userId: string;

  @IsInt()
  @Min(1)
  @Max(8640000000000000)
  receiptDate: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  businessAddress: string;

  @IsOptional()
  @IsString()
  businessLogo?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  customerId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  currency: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineItemDto)
  lineItems: ReceiptLineItemDto[];
}
