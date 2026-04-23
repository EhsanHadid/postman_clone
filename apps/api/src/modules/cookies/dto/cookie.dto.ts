import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateCookieDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsBoolean()
  httpOnly?: boolean;

  @IsOptional()
  @IsString()
  sameSite?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;
}
