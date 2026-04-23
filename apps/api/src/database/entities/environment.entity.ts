import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";
import { EnvironmentVariableEntity } from "./environment-variable.entity";

@Entity("environments")
export class EnvironmentEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.environments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "boolean", default: false })
  isGlobal!: boolean;

  @OneToMany(() => EnvironmentVariableEntity, (variable) => variable.environment, {
    cascade: true,
  })
  variables!: EnvironmentVariableEntity[];
}
