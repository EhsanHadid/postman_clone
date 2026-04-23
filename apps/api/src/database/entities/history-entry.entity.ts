import { HttpMethod, ProtocolType } from "@postman-clone/shared-types";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";
import { RequestEntity } from "./request.entity";

@Entity("history_entries")
export class HistoryEntryEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.historyEntries, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ nullable: true })
  requestId!: string | null;

  @ManyToOne(() => RequestEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "requestId" })
  request!: RequestEntity | null;

  @Column({ type: "varchar", length: 24 })
  protocolType!: ProtocolType;

  @Column({ type: "varchar", length: 8 })
  method!: HttpMethod;

  @Column({ type: "text" })
  url!: string;

  @Column({ type: "json" })
  requestHeaders!: Record<string, string>;

  @Column({ type: "longtext", default: "" })
  requestBody!: string;

  @Column({ type: "int" })
  responseStatus!: number;

  @Column({ type: "json" })
  responseHeaders!: Record<string, string>;

  @Column({ type: "longtext" })
  responseBody!: string;

  @Column({ type: "int" })
  durationMs!: number;
}
