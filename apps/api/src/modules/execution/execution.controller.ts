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
