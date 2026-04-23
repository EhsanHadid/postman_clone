import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

@Entity("backup_metadata")
export class BackupMetadataEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.backups, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "int", default: 1 })
  version!: number;
}
