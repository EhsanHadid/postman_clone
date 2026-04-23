import { IsObject, IsOptional, IsString } from "class-validator";

export class RestoreBackupDto {
  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  mode?: "replace" | "merge";
}
