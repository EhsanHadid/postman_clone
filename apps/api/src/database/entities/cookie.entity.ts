import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

@Entity("cookies")
export class CookieEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.cookies, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ length: 191 })
  domain!: string;

  @Column({ length: 191, default: "/" })
  path!: string;

  @Column({ length: 191 })
  name!: string;

  @Column({ type: "longtext" })
  value!: string;

  @Column({ type: "boolean", default: false })
  secure!: boolean;

  @Column({ type: "boolean", default: false })
  httpOnly!: boolean;

  @Column({ type: "varchar", length: 24, nullable: true })
  sameSite!: string | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt!: Date | null;
}
