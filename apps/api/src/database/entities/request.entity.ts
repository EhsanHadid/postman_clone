import {
  AuthType,
  HttpMethod,
  KeyValueItem,
  MultipartFormValue,
  ProtocolType,
  RequestAuthConfig,
  RequestBodyType,
} from "@postman-clone/shared-types";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { CollectionEntity } from "./collection.entity";
import { FolderEntity } from "./folder.entity";
import { RequestSnapshotEntity } from "./request-snapshot.entity";

@Entity("requests")
export class RequestEntity extends BaseEntity {
  @Column()
  collectionId!: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.requests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "collectionId" })
  collection!: CollectionEntity;

  @Column({ nullable: true })
  folderId!: string | null;

  @ManyToOne(() => FolderEntity, (folder) => folder.requests, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "folderId" })
  folder!: FolderEntity | null;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 24 })
  protocolType!: ProtocolType;

  @Column({ type: "varchar", length: 8, default: "GET" })
  method!: HttpMethod;

  @Column({ type: "text", default: "" })
  url!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  trpcProcedurePath!: string | null;

  @Column({ type: "json" })
  headers!: KeyValueItem[];

  @Column({ type: "json" })
  queryParams!: KeyValueItem[];

  @Column({ type: "varchar", length: 40, default: "none" })
  bodyType!: RequestBodyType;

  @Column({ type: "longtext" })
  body!: string;

  @Column({ type: "json" })
  formData!: MultipartFormValue[];

  @Column({ type: "varchar", length: 24, nullable: true })
  authType!: AuthType | null;

  @Column({ type: "json", nullable: true })
  authConfig!: RequestAuthConfig | null;

  @Column({ type: "longtext", default: "" })
  preRequestScript!: string;

  @Column({ type: "longtext", default: "" })
  postResponseScript!: string;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @OneToMany(() => RequestSnapshotEntity, (snapshot) => snapshot.request)
  snapshots!: RequestSnapshotEntity[];
}
