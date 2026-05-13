import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type PublicAppConfig = {
  desktopDownloadUrl: string | null;
};

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  getPublicConfig(): PublicAppConfig {
    const desktopDownloadUrl =
      this.configService.get<string>("DESKTOP_APP_DOWNLOAD_URL")?.trim() || null;

    return {
      desktopDownloadUrl,
    };
  }
}
