import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AuthType, RequestAuthConfig } from "@postman-clone/shared-types";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";
import { FolderEntity } from "./folder.entity";
import { RequestEntity } from "./request.entity";
import { WorkspaceEntity } from "./workspace.entity";

@Entity("collections")
export class CollectionEntity extends BaseEntity {
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.collections, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column()
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.collections, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "workspaceId" })
  workspace!: WorkspaceEntity;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "varchar", length: 24, nullable: true })
  authType!: AuthType | null;

  @Column({ type: "json", nullable: true })
  authConfig!: RequestAuthConfig | null;

  @OneToMany(() => FolderEntity, (folder) => folder.collection)
  folders!: FolderEntity[];

  @OneToMany(() => RequestEntity, (request) => request.collection)
  requests!: RequestEntity[];
}
