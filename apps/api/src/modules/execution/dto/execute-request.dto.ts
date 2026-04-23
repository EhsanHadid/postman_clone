import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { HttpMethod, ProtocolType, RequestBodyType } from "@postman-clone/shared-types";
import {
  KeyValueItemDto,
  MultipartFormValueDto,
  RequestAuthConfigDto,
} from "../../requests/dto/request-parts.dto";

const protocols: ProtocolType[] = ["http", "trpc", "grpc", "rpc"];
const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const bodyTypes: RequestBodyType[] = [
  "none",
  "json",
  "text",
  "form-urlencoded",
  "multipart-form-data",
];

export class ExecuteRequestDraftDto {
  @IsEnum(protocols)
  protocolType!: ProtocolType;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsString()
  name?: string;

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
  @IsString()
  authType?: string | null;

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
}

export class ExecuteRequestDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @ValidateNested()
  @Type(() => ExecuteRequestDraftDto)
  request!: ExecuteRequestDraftDto;

  @IsOptional()
  @IsString()
  activeEnvironmentId?: string | null;
}
