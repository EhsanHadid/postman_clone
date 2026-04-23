import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CollectionEntity,
  FolderEntity,
  RequestEntity,
  RequestSnapshotEntity,
} from "../../database/entities";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestEntity,
      RequestSnapshotEntity,
      CollectionEntity,
      FolderEntity,
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
