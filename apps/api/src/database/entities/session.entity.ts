import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

@Entity("sessions")
export class SessionEntity extends BaseEntity {
  @Column({ unique: true, length: 128 })
  sessionToken!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.sessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;
}
