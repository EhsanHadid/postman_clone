import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { RestoreBackupDto } from "./dto/restore-backup.dto";
import { BackupService } from "./backup.service";

@UseGuards(SessionAuthGuard)
@Controller("backup")
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get("export")
  exportWorkspace(@CurrentUser() user: UserEntity) {
    return this.backupService.exportWorkspace(user.id);
  }

  @Post("restore")
  restoreWorkspace(@CurrentUser() user: UserEntity, @Body() dto: RestoreBackupDto) {
    return this.backupService.restoreWorkspace(user.id, dto);
  }
}
