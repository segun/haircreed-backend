import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';

class NewAddressDto {
  @IsString()
  address: string;

  @IsBoolean()
  isPrimary: boolean;
}

class UpdatedAddressDto {
  @IsString()
  id: string;

  @IsString()
  address: string;

  @IsBoolean()
  isPrimary: boolean;

  @IsNumber()
  createdAt: number;
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

  @IsBoolean()
  @IsOptional()
  addressChanged?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatedAddressDto)
  updatedAddresses?: UpdatedAddressDto[];
}
