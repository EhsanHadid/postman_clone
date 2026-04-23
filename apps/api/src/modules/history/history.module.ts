import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HistoryEntryEntity } from "../../database/entities/history-entry.entity";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [TypeOrmModule.forFeature([HistoryEntryEntity])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
