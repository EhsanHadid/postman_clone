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
import { CollectionsService } from "./collections.service";
import { CreateCollectionDto, UpdateCollectionDto } from "./dto/collection.dto";

@UseGuards(SessionAuthGuard)
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.collectionsService.listTreeForDefaultWorkspace(user.id);
  }

  @Get("workspace/:workspaceId")
  listByWorkspace(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.collectionsService.listTree(user.id, workspaceId);
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.createInDefaultWorkspace(user.id, dto);
  }

  @Post("workspace/:workspaceId")
  createInWorkspace(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.create(user.id, workspaceId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.collectionsService.delete(user.id, id);
    return { success: true };
  }
}
