import { WorkspaceRole } from "@postman-clone/shared-types";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

const memberRoles: WorkspaceRole[] = ["ADMIN", "CONTRIBUTOR", "READONLY"];

export class CreateWorkspaceDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddWorkspaceMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(memberRoles)
  role!: Exclude<WorkspaceRole, "OWNER">;
}

export class UpdateWorkspaceMemberDto {
  @IsEnum(memberRoles)
  role!: Exclude<WorkspaceRole, "OWNER">;
}
