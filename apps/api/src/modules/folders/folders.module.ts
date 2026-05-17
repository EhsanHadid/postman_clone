import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionEntity, FolderEntity, RequestEntity } from "../../database/entities";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({
  imports: [TypeOrmModule.forFeature([FolderEntity, CollectionEntity, RequestEntity]), WorkspacesModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
