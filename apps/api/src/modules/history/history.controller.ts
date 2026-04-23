import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { HistoryService } from "./history.service";

@UseGuards(SessionAuthGuard)
@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.historyService.list(user.id);
  }

  @Get(":id")
  getOne(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    return this.historyService.getOne(user.id, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.historyService.delete(user.id, id);
    return { success: true };
  }
}
