import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EnvironmentEntity,
  EnvironmentVariableEntity,
} from "../../database/entities";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { EnvironmentVariablesController } from "./environment-variables.controller";
import { EnvironmentsController } from "./environments.controller";
import { EnvironmentsService } from "./environments.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([EnvironmentEntity, EnvironmentVariableEntity]),
    WorkspacesModule,
  ],
  controllers: [EnvironmentsController, EnvironmentVariablesController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
