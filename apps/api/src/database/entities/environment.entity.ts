import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";
import { EnvironmentVariableEntity } from "./environment-variable.entity";
import { WorkspaceEntity } from "./workspace.entity";

@Entity("environments")
export class EnvironmentEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.environments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column()
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.environments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "workspaceId" })
  workspace!: WorkspaceEntity;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "boolean", default: false })
  isGlobal!: boolean;

  @OneToMany(() => EnvironmentVariableEntity, (variable) => variable.environment, {
    cascade: true,
  })
  variables!: EnvironmentVariableEntity[];
}
