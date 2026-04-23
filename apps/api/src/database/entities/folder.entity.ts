import { AuthType, RequestAuthConfig } from "@postman-clone/shared-types";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { CollectionEntity } from "./collection.entity";
import { RequestEntity } from "./request.entity";

@Entity("folders")
export class FolderEntity extends BaseEntity {
  @Column()
  collectionId!: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.folders, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "collectionId" })
  collection!: CollectionEntity;

  @Column({ nullable: true })
  parentFolderId!: string | null;

  @ManyToOne(() => FolderEntity, (folder) => folder.children, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parentFolderId" })
  parentFolder!: FolderEntity | null;

  @OneToMany(() => FolderEntity, (folder) => folder.parentFolder)
  children!: FolderEntity[];

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "varchar", length: 24, nullable: true })
  authType!: AuthType | null;

  @Column({ type: "json", nullable: true })
  authConfig!: RequestAuthConfig | null;

  @OneToMany(() => RequestEntity, (request) => request.folder)
  requests!: RequestEntity[];
}
