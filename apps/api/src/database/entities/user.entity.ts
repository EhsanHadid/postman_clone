import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { CollectionEntity } from "./collection.entity";
import { CookieEntity } from "./cookie.entity";
import { EnvironmentEntity } from "./environment.entity";
import { HistoryEntryEntity } from "./history-entry.entity";
import { SessionEntity } from "./session.entity";
import { BackupMetadataEntity } from "./backup-metadata.entity";
import { WorkspaceEntity } from "./workspace.entity";
import { WorkspaceMemberEntity } from "./workspace-member.entity";

@Entity("users")
export class UserEntity extends BaseEntity {
  @Column({ unique: true, length: 64 })
  username!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions!: SessionEntity[];

  @OneToMany(() => CollectionEntity, (collection) => collection.user)
  collections!: CollectionEntity[];

  @OneToMany(() => EnvironmentEntity, (environment) => environment.user)
  environments!: EnvironmentEntity[];

  @OneToMany(() => CookieEntity, (cookie) => cookie.user)
  cookies!: CookieEntity[];

  @OneToMany(() => HistoryEntryEntity, (entry) => entry.user)
  historyEntries!: HistoryEntryEntity[];

  @OneToMany(() => BackupMetadataEntity, (backup) => backup.user)
  backups!: BackupMetadataEntity[];

  @OneToMany(() => WorkspaceEntity, (workspace) => workspace.owner)
  ownedWorkspaces!: WorkspaceEntity[];

  @OneToMany(() => WorkspaceEntity, (workspace) => workspace.createdBy)
  createdWorkspaces!: WorkspaceEntity[];

  @OneToMany(() => WorkspaceMemberEntity, (member) => member.user)
  workspaceMemberships!: WorkspaceMemberEntity[];

  @OneToMany(() => WorkspaceMemberEntity, (member) => member.addedBy)
  addedWorkspaceMembers!: WorkspaceMemberEntity[];
}
