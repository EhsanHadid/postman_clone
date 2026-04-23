import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { EnvironmentEntity } from "./environment.entity";

@Entity("environment_variables")
export class EnvironmentVariableEntity extends BaseEntity {
  @Column()
  environmentId!: string;

  @ManyToOne(() => EnvironmentEntity, (environment) => environment.variables, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "environmentId" })
  environment!: EnvironmentEntity;

  @Column({ length: 120 })
  key!: string;

  @Column({ type: "longtext" })
  value!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "text", nullable: true })
  description!: string | null;
}
