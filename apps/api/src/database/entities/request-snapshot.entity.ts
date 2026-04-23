import {
  AuthType,
  HttpMethod,
  KeyValueItem,
  RequestAuthConfig,
  RequestBodyType,
} from "@postman-clone/shared-types";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { RequestEntity } from "./request.entity";

@Entity("request_snapshots")
export class RequestSnapshotEntity extends BaseEntity {
  @Column()
  requestId!: string;

  @ManyToOne(() => RequestEntity, (request) => request.snapshots, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "requestId" })
  request!: RequestEntity;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 8, default: "GET" })
  method!: HttpMethod;

  @Column({ type: "text", default: "" })
  url!: string;

  @Column({ type: "longtext", default: "" })
  body!: string;

  @Column({ type: "json" })
  headers!: KeyValueItem[];

  @Column({ type: "json" })
  queryParams!: KeyValueItem[];

  @Column({ type: "varchar", length: 40, default: "none" })
  bodyType!: RequestBodyType;

  @Column({ type: "varchar", length: 24, nullable: true })
  authType!: AuthType | null;

  @Column({ type: "json", nullable: true })
  authConfig!: RequestAuthConfig | null;

  @Column({ type: "longtext", default: "" })
  preRequestScript!: string;

  @Column({ type: "longtext", default: "" })
  postResponseScript!: string;
}
