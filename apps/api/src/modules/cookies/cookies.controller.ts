import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { UpdateCookieDto } from "./dto/cookie.dto";
import { CookiesService } from "./cookies.service";

@UseGuards(SessionAuthGuard)
@Controller("cookies")
export class CookiesController {
  constructor(private readonly cookiesService: CookiesService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.cookiesService.list(user.id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateCookieDto,
  ) {
    return this.cookiesService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.cookiesService.delete(user.id, id);
    return { success: true };
  }

  @Delete("domain/:domain")
  async clearDomain(
    @CurrentUser() user: UserEntity,
    @Param("domain") domain: string,
  ) {
    await this.cookiesService.deleteDomain(user.id, domain);
    return { success: true };
  }
}
