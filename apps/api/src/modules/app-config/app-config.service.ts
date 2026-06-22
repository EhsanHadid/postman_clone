import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type DesktopPlatform = "windows" | "linux" | "macos";

export type PublicAppConfig = {
  desktopDownloadUrl: string | null;
  desktopDownloadUrls: Record<DesktopPlatform, string | null>;
};

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  private readUrl(key: string): string | null {
    return this.configService.get<string>(key)?.trim() || null;
  }

  getPublicConfig(): PublicAppConfig {
    const desktopDownloadUrl = this.readUrl("DESKTOP_APP_DOWNLOAD_URL");

    return {
      desktopDownloadUrl,
      desktopDownloadUrls: {
        windows: desktopDownloadUrl,
        linux: this.readUrl("DESKTOP_APP_DOWNLOAD_URL_LINUX"),
        macos: this.readUrl("DESKTOP_APP_DOWNLOAD_URL_MACOS"),
      },
    };
  }
}
