import { IsObject, IsOptional, IsString } from "class-validator";

export class ImportPostmanDto {
  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
