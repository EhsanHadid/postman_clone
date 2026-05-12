import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { ExecuteRequestDto } from "./dto/execute-request.dto";
import { ExecutionService } from "./execution.service";

@UseGuards(SessionAuthGuard)
@Controller("execute")
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  /**
   * Deprecated for the desktop app: live request execution now runs locally in
   * Electron and must not receive request/response bodies from the renderer.
   * Keep this only for legacy web-only deployments until they are retired.
   */
  @Post()
  execute(@CurrentUser() user: UserEntity, @Body() dto: ExecuteRequestDto) {
    return this.executionService.execute(user.id, dto);
  }

  @Post("http")
  executeHttp(@CurrentUser() user: UserEntity, @Body() dto: ExecuteRequestDto) {
    return this.executionService.execute(user.id, {
      ...dto,
      request: {
        ...dto.request,
        protocolType: "http",
      },
    });
  }

  @Post("trpc")
  executeTrpc(@CurrentUser() user: UserEntity, @Body() dto: ExecuteRequestDto) {
    return this.executionService.execute(user.id, {
      ...dto,
      request: {
        ...dto.request,
        protocolType: "trpc",
      },
    });
  }
}
