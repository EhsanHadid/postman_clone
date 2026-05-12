import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BackupMetadataEntity,
  CollectionEntity,
  CookieEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  FolderEntity,
  HistoryEntryEntity,
  RequestEntity,
  RequestSnapshotEntity,
} from "../../database/entities";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BackupMetadataEntity,
      CollectionEntity,
      FolderEntity,
      RequestEntity,
      RequestSnapshotEntity,
      EnvironmentEntity,
      EnvironmentVariableEntity,
      CookieEntity,
      HistoryEntryEntity,
    ]),
    WorkspacesModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
