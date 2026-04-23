import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionEntity, FolderEntity } from "../../database/entities";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({
  imports: [TypeOrmModule.forFeature([FolderEntity, CollectionEntity])],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
