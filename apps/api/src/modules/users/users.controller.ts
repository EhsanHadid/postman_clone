import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities";
import { UsersService } from "./users.service";

@UseGuards(SessionAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("search")
  search(
    @CurrentUser() user: UserEntity,
    @Query("q") query = "",
    @Query("excludeWorkspaceId") excludeWorkspaceId?: string,
  ) {
    return this.usersService.searchPublicUsers(user.id, query, excludeWorkspaceId);
  }
}
