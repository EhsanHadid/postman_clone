import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities/user.entity";
import { ImportClientDto } from "./dto/import-client.dto";
import { ImportPostmanDto } from "./dto/import-postman.dto";
import { ImportExportService } from "./import-export.service";

@UseGuards(SessionAuthGuard)
@Controller("import")
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Post("postman")
  importPostman(@CurrentUser() user: UserEntity, @Body() dto: ImportPostmanDto) {
    return this.importExportService.importPostman(user.id, dto);
  }

  @Post("insomnia")
  importInsomnia(@CurrentUser() user: UserEntity, @Body() dto: ImportClientDto) {
    return this.importExportService.importInsomnia(user.id, dto);
  }

  @Post("hoppscotch")
  importHoppscotch(@CurrentUser() user: UserEntity, @Body() dto: ImportClientDto) {
    return this.importExportService.importHoppscotch(user.id, dto);
  }
}
