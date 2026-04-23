import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import {
  AuthType,
  HttpMethod,
  ProtocolType,
  RequestBodyType,
} from "@postman-clone/shared-types";
import {
  KeyValueItemDto,
  MultipartFormValueDto,
  RequestAuthConfigDto,
} from "./request-parts.dto";

const authTypes: AuthType[] = ["inherit", "none", "basic", "bearer"];
const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const protocols: ProtocolType[] = ["http", "trpc", "grpc", "rpc"];
const bodyTypes: RequestBodyType[] = [
  "none",
  "json",
  "text",
  "form-urlencoded",
  "multipart-form-data",
];

export class CreateRequestDto {
  @IsString()
  collectionId!: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(protocols)
  protocolType!: ProtocolType;

  @IsOptional()
  @IsEnum(methods)
  method?: HttpMethod;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  trpcProcedurePath?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyValueItemDto)
  headers?: KeyValueItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyValueItemDto)
  queryParams?: KeyValueItemDto[];

  @IsOptional()
  @IsEnum(bodyTypes)
  bodyType?: RequestBodyType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipartFormValueDto)
  formData?: MultipartFormValueDto[];

  @IsOptional()
  @IsEnum(authTypes)
  authType?: AuthType | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequestAuthConfigDto)
  authConfig?: RequestAuthConfigDto | null;

  @IsOptional()
  @IsString()
  preRequestScript?: string;

  @IsOptional()
  @IsString()
  postResponseScript?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(protocols)
  protocolType?: ProtocolType;

  @IsOptional()
  @IsEnum(methods)
  method?: HttpMethod;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  trpcProcedurePath?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyValueItemDto)
  headers?: KeyValueItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyValueItemDto)
  queryParams?: KeyValueItemDto[];

  @IsOptional()
  @IsEnum(bodyTypes)
  bodyType?: RequestBodyType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipartFormValueDto)
  formData?: MultipartFormValueDto[];

  @IsOptional()
  @IsEnum(authTypes)
  authType?: AuthType | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequestAuthConfigDto)
  authConfig?: RequestAuthConfigDto | null;

  @IsOptional()
  @IsString()
  preRequestScript?: string;

  @IsOptional()
  @IsString()
  postResponseScript?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
