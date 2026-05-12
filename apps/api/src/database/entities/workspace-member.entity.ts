import { WorkspaceRole } from "@postman-clone/shared-types";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";
import { WorkspaceEntity } from "./workspace.entity";

@Entity("workspace_members")
@Unique("UQ_workspace_members_workspace_user", ["workspaceId", "userId"])
@Index("IDX_workspace_members_workspace", ["workspaceId"])
@Index("IDX_workspace_members_user", ["userId"])
export class WorkspaceMemberEntity extends BaseEntity {
  @Column()
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.members, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "workspaceId" })
  workspace!: WorkspaceEntity;

  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.workspaceMemberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: "varchar", length: 24 })
  role!: WorkspaceRole;

  @Column({ nullable: true })
  addedById!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.addedWorkspaceMembers, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "addedById" })
  addedBy!: UserEntity | null;
}
