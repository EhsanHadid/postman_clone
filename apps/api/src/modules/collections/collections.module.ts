import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CollectionEntity,
  FolderEntity,
  RequestEntity,
} from "../../database/entities";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([CollectionEntity, FolderEntity, RequestEntity]),
    WorkspacesModule,
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
