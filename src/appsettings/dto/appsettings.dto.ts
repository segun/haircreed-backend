import { Type } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class Settings {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  vatRate: number;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  businessLogo?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateAppSettingsDto {
  @ValidateNested()
  @Type(() => Settings)
  settings: Settings;
}

export interface AppSettings {
  id: string;
  settings: Settings;
}
