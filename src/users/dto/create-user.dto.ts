import { IsString, IsEmail, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsBoolean()
  requiresPasswordReset: boolean;
}
