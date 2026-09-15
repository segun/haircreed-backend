import { IsNotEmpty, IsString, Matches } from "class-validator";

export class ResolveReceiptDraftDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  orderId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  userId: string;
}
