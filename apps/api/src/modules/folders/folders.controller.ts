import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { CreateFolderDto, UpdateFolderDto } from "./dto/folder.dto";
import { FoldersService } from "./folders.service";

@UseGuards(SessionAuthGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    await this.foldersService.delete(user.id, id);
    return { success: true };
  }
}
