import { Injectable } from "@nestjs/common";
import { safeJsonParse } from "@postman-clone/shared-utils";

@Injectable()
export class TrpcService {
  resolveUrl(baseUrl: string, procedurePath: string): string {
    const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
    const normalizedProcedure = procedurePath.replace(/^\//, "");
    const trpcBase = trimmedBaseUrl.endsWith("/trpc")
      ? trimmedBaseUrl
      : `${trimmedBaseUrl}/trpc`;

    return `${trpcBase}/${normalizedProcedure}`;
  }

  createBody(body: string): string {
    const parsed = safeJsonParse<unknown>(body || "{}", {});
    return JSON.stringify(parsed);
  }
}
