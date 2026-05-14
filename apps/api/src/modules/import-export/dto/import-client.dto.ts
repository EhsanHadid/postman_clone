import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class ImportClientDto {
  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsIn(["add", "mergeOverride"])
  conflictStrategy?: "add" | "mergeOverride";
}
