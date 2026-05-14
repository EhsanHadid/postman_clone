import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { CollectionEntity } from "./collection.entity";
import { EnvironmentEntity } from "./environment.entity";
import { UserEntity } from "./user.entity";
import { WorkspaceMemberEntity } from "./workspace-member.entity";

@Entity("workspaces")
export class WorkspaceEntity extends BaseEntity {
  @Column({ length: 120 })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column()
  ownerId!: string;

  @ManyToOne(() => UserEntity, (user) => user.ownedWorkspaces, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownerId" })
  owner!: UserEntity;

  @Column()
  createdById!: string;

  @ManyToOne(() => UserEntity, (user) => user.createdWorkspaces, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "createdById" })
  createdBy!: UserEntity;

  @OneToMany(() => WorkspaceMemberEntity, (member) => member.workspace)
  members!: WorkspaceMemberEntity[];

  @OneToMany(() => CollectionEntity, (collection) => collection.workspace)
  collections!: CollectionEntity[];

  @OneToMany(() => EnvironmentEntity, (environment) => environment.workspace)
  environments!: EnvironmentEntity[];
}
