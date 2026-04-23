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
import { CreateRequestDto, UpdateRequestDto } from "./dto/request.dto";
import { RequestsService } from "./requests.service";

@UseGuards(SessionAuthGuard)
@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get(":id")
  getOne(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    return this.requestsService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.requestsService.delete(user.id, id);
    return { success: true };
  }

  @Post(":id/duplicate")
  duplicate(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    return this.requestsService.duplicate(user.id, id);
  }
}
