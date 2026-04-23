import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { UpdateEnvironmentVariableDto } from "./dto/environment.dto";
import { EnvironmentsService } from "./environments.service";

@UseGuards(SessionAuthGuard)
@Controller("environment-variables")
export class EnvironmentVariablesController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateEnvironmentVariableDto,
  ) {
    return this.environmentsService.updateVariable(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.environmentsService.deleteVariable(user.id, id);
    return { success: true };
  }
}
