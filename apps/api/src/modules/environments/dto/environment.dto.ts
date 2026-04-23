import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEnvironmentDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class UpdateEnvironmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class CreateEnvironmentVariableDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateEnvironmentVariableDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
