import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CollectionEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  FolderEntity,
  RequestEntity,
} from "../../database/entities";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { ImportExportController } from "./import-export.controller";
import { ImportExportService } from "./import-export.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionEntity,
      EnvironmentEntity,
      EnvironmentVariableEntity,
      FolderEntity,
      RequestEntity,
    ]),
    WorkspacesModule,
  ],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
