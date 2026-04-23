import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EnvironmentEntity,
  EnvironmentVariableEntity,
} from "../../database/entities";
import { EnvironmentVariablesController } from "./environment-variables.controller";
import { EnvironmentsController } from "./environments.controller";
import { EnvironmentsService } from "./environments.service";

@Module({
  imports: [TypeOrmModule.forFeature([EnvironmentEntity, EnvironmentVariableEntity])],
  controllers: [EnvironmentsController, EnvironmentVariablesController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
