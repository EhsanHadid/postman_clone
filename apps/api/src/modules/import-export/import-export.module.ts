import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CollectionEntity,
  FolderEntity,
  RequestEntity,
} from "../../database/entities";
import { ImportExportController } from "./import-export.controller";
import { ImportExportService } from "./import-export.service";

@Module({
  imports: [TypeOrmModule.forFeature([CollectionEntity, FolderEntity, RequestEntity])],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
