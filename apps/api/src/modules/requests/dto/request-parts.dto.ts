import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class KeyValueItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(200)
  key = "";

  @IsString()
  value = "";

  @IsBoolean()
  enabled = true;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MultipartFormValueDto extends KeyValueItemDto {
  @IsOptional()
  @IsIn(["text", "file"])
  valueType?: "text" | "file";

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class RequestAuthConfigDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
