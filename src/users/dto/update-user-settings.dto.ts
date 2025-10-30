
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
