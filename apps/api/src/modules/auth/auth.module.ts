import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionEntity } from "../../database/entities/session.entity";
import { EnvironmentsModule } from "../environments/environments.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    UsersModule,
    EnvironmentsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
