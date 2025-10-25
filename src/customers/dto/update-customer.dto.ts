import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  ValidateNested,
} from 'class-validator';

class NewAddressDto {
  @IsString()
  address: string;

  @IsBoolean()
  isPrimary: boolean;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  headSize?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewAddressDto)
  newAddress?: NewAddressDto;
}
