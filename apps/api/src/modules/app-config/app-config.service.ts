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

  private deriveLinuxUrl(windowsUrl: string | null): string | null {
    if (!windowsUrl) {
      return null;
    }

    const linuxUrl = windowsUrl.replace(/Windows-x64\.exe$/i, "Linux-x64.deb");
    return linuxUrl === windowsUrl ? null : linuxUrl;
  }

  getPublicConfig(): PublicAppConfig {
    const desktopDownloadUrl = this.readUrl("DESKTOP_APP_DOWNLOAD_URL");
    const linuxDownloadUrl =
      this.readUrl("DESKTOP_APP_DOWNLOAD_URL_LINUX") ??
      this.deriveLinuxUrl(desktopDownloadUrl);

    return {
      desktopDownloadUrl,
      desktopDownloadUrls: {
        windows: desktopDownloadUrl,
        linux: linuxDownloadUrl,
        macos: this.readUrl("DESKTOP_APP_DOWNLOAD_URL_MACOS"),
      },
    };
  }
}
