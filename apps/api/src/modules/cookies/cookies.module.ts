import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CookieEntity } from "../../database/entities/cookie.entity";
import { CookiesController } from "./cookies.controller";
import { CookiesService } from "./cookies.service";

@Module({
  imports: [TypeOrmModule.forFeature([CookieEntity])],
  controllers: [CookiesController],
  providers: [CookiesService],
  exports: [CookiesService],
})
export class CookiesModule {}
