import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CookieEntity } from "../../database/entities/cookie.entity";
import { UpdateCookieDto } from "./dto/cookie.dto";

interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  expiresAt: Date | null;
}

@Injectable()
export class CookiesService {
  constructor(
    @InjectRepository(CookieEntity)
    private readonly cookieRepository: Repository<CookieEntity>,
  ) {}

  list(userId: string) {
    return this.cookieRepository.find({
      where: { userId },
      order: {
        domain: "ASC",
        name: "ASC",
      },
    });
  }

  async update(userId: string, cookieId: string, dto: UpdateCookieDto): Promise<CookieEntity> {
    const cookie = await this.findOwned(userId, cookieId);

    Object.assign(cookie, {
      value: dto.value ?? cookie.value,
      path: dto.path ?? cookie.path,
      secure: dto.secure ?? cookie.secure,
      httpOnly: dto.httpOnly ?? cookie.httpOnly,
      sameSite: dto.sameSite === undefined ? cookie.sameSite : dto.sameSite,
      expiresAt:
        dto.expiresAt === undefined
          ? cookie.expiresAt
          : dto.expiresAt
            ? new Date(dto.expiresAt)
            : null,
    });

    return this.cookieRepository.save(cookie);
  }

  async delete(userId: string, cookieId: string): Promise<void> {
    const cookie = await this.findOwned(userId, cookieId);
    await this.cookieRepository.remove(cookie);
  }

  async deleteDomain(userId: string, domain: string): Promise<void> {
    await this.cookieRepository.delete({ userId, domain });
  }

  async getCookiesForUrl(userId: string, rawUrl: string): Promise<CookieEntity[]> {
    const url = new URL(rawUrl);
    const allCookies = await this.cookieRepository.find({
      where: { userId },
    });

    const now = Date.now();

    return allCookies.filter((cookie) => {
      if (cookie.expiresAt && cookie.expiresAt.getTime() < now) {
        return false;
      }

      const domainMatches =
        url.hostname === cookie.domain ||
        url.hostname.endsWith(`.${cookie.domain.replace(/^\./, "")}`);
      const pathMatches = url.pathname.startsWith(cookie.path || "/");
      const secureMatches = !cookie.secure || url.protocol === "https:";

      return domainMatches && pathMatches && secureMatches;
    });
  }

  async getCookieHeader(userId: string, rawUrl: string): Promise<string> {
    const cookies = await this.getCookiesForUrl(userId, rawUrl);
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }

  async absorbResponseCookies(
    userId: string,
    rawUrl: string,
    setCookieHeaders: string[],
  ): Promise<void> {
    const url = new URL(rawUrl);

    for (const header of setCookieHeaders) {
      const parsed = this.parseSetCookie(url, header);

      const existing = await this.cookieRepository.findOne({
        where: {
          userId,
          domain: parsed.domain,
          path: parsed.path,
          name: parsed.name,
        },
      });

      if (existing) {
        Object.assign(existing, parsed);
        await this.cookieRepository.save(existing);
      } else {
        await this.cookieRepository.save(
          this.cookieRepository.create({
            userId,
            ...parsed,
          }),
        );
      }
    }
  }

  private async findOwned(userId: string, cookieId: string): Promise<CookieEntity> {
    const cookie = await this.cookieRepository.findOne({
      where: { id: cookieId, userId },
    });

    if (!cookie) {
      throw new NotFoundException("Cookie not found.");
    }

    return cookie;
  }

  private parseSetCookie(url: URL, header: string): ParsedCookie {
    const [nameValue, ...parts] = header.split(";").map((part) => part.trim());
    const separatorIndex = nameValue.indexOf("=");
    const name = nameValue.slice(0, separatorIndex);
    const value = nameValue.slice(separatorIndex + 1);

    const parsed: ParsedCookie = {
      name,
      value,
      domain: url.hostname,
      path: "/",
      secure: false,
      httpOnly: false,
      sameSite: null,
      expiresAt: null,
    };

    for (const part of parts) {
      const [rawKey, rawValue] = part.split("=");
      const key = rawKey.toLowerCase();
      const nextValue = rawValue?.trim();

      if (key === "domain" && nextValue) {
        parsed.domain = nextValue.replace(/^\./, "");
      }

      if (key === "path" && nextValue) {
        parsed.path = nextValue;
      }

      if (key === "secure") {
        parsed.secure = true;
      }

      if (key === "httponly") {
        parsed.httpOnly = true;
      }

      if (key === "samesite" && nextValue) {
        parsed.sameSite = nextValue;
      }

      if (key === "expires" && nextValue) {
        parsed.expiresAt = new Date(nextValue);
      }
    }

    return parsed;
  }
}
