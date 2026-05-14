import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import {
  CreateEnvironmentDto,
  CreateEnvironmentVariableDto,
  UpdateEnvironmentDto,
} from "./dto/environment.dto";
import { EnvironmentsService } from "./environments.service";

@UseGuards(SessionAuthGuard)
@Controller("environments")
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.environmentsService.listForDefaultWorkspace(user.id);
  }

  @Get("workspace/:workspaceId")
  listByWorkspace(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.environmentsService.list(user.id, workspaceId);
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateEnvironmentDto) {
    return this.environmentsService.createInDefaultWorkspace(user.id, dto);
  }

  @Post("workspace/:workspaceId")
  createInWorkspace(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.environmentsService.create(user.id, workspaceId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.environmentsService.delete(user.id, id);
    return { success: true };
  }

  @Post(":id/variables")
  createVariable(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: CreateEnvironmentVariableDto,
  ) {
    return this.environmentsService.addVariable(user.id, id, dto);
  }
}
