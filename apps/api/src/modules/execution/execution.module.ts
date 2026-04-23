import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CollectionEntity,
  FolderEntity,
} from "../../database/entities";
import { CookiesModule } from "../cookies/cookies.module";
import { EnvironmentsModule } from "../environments/environments.module";
import { HistoryModule } from "../history/history.module";
import { RequestsModule } from "../requests/requests.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ExecutionController } from "./execution.controller";
import { ExecutionService } from "./execution.service";
import { ScriptRunnerService } from "./script-runner.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([CollectionEntity, FolderEntity]),
    RequestsModule,
    EnvironmentsModule,
    CookiesModule,
    HistoryModule,
    TrpcModule,
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService, ScriptRunnerService],
})
export class ExecutionModule {}
