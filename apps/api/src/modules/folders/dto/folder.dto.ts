import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { AuthType } from "@postman-clone/shared-types";
import { RequestAuthConfigDto } from "../../requests/dto/request-parts.dto";

export class CreateFolderDto {
  @IsString()
  collectionId!: string;

  @IsOptional()
  @IsString()
  parentFolderId?: string | null;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(["inherit", "none", "basic", "bearer"] as AuthType[])
  authType?: AuthType;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequestAuthConfigDto)
  authConfig?: RequestAuthConfigDto;
}

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  parentFolderId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(["inherit", "none", "basic", "bearer"] as AuthType[])
  authType?: AuthType | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequestAuthConfigDto)
  authConfig?: RequestAuthConfigDto | null;
}
