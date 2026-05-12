import type {
  LocalRequestInput,
  LocalRequestResponse,
  MultipartFormValue,
} from "@postman-clone/shared-types";

const maxResponseBytes = 25 * 1024 * 1024;
const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export class LocalRequestExecutor {
  private readonly controllers = new Map<string, AbortController>();

  cancel(requestId: string): { cancelled: boolean } {
    const controller = this.controllers.get(requestId);
    if (!controller) {
      return { cancelled: false };
    }

    controller.abort();
    this.controllers.delete(requestId);
    return { cancelled: true };
  }

  async execute(input: LocalRequestInput): Promise<LocalRequestResponse> {
    const validationError = this.validate(input);
    if (validationError) {
      return validationError;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), input.timeoutMs ?? 60_000);
    const startedAt = performance.now();
    this.controllers.set(input.id, controller);

    try {
      const response = await this.fetchWithRedirects(input, controller);
      const durationMs = Math.round(performance.now() - startedAt);
      const bodyBuffer = Buffer.from(await response.arrayBuffer());

      if (bodyBuffer.byteLength > maxResponseBytes) {
        return this.error(input.id, "RESPONSE_TOO_LARGE", "Response is larger than the local 25 MB limit.", {
          sizeBytes: bodyBuffer.byteLength,
        });
      }

      const headers = this.readHeaders(response.headers);
      const contentType = response.headers.get("content-type") ?? "";
      const isText = this.isTextContent(contentType);
      const body = isText ? bodyBuffer.toString("utf8") : undefined;

      return {
        id: input.id,
        ok: true,
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        bodyBase64: isText ? undefined : bodyBuffer.toString("base64"),
        bodyType: contentType.includes("application/json") ? "json" : isText ? "text" : "binary",
        durationMs,
        sizeBytes: bodyBuffer.byteLength,
      };
    } catch (error) {
      return this.toErrorResponse(input.id, error);
    } finally {
      clearTimeout(timeout);
      this.controllers.delete(input.id);
    }
  }

  private validate(input: LocalRequestInput): LocalRequestResponse | null {
    if (!input.id || typeof input.id !== "string") {
      return this.error("", "INVALID_INPUT", "Request id is required.");
    }

    if (!allowedMethods.has(input.method.toUpperCase())) {
      return this.error(input.id, "INVALID_METHOD", "Unsupported HTTP method.");
    }

    try {
      const url = new URL(input.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return this.error(input.id, "INVALID_URL", "Only http and https URLs are supported.");
      }
    } catch {
      return this.error(input.id, "INVALID_URL", "Request URL must be a valid absolute URL.");
    }

    return null;
  }

  private async fetchWithRedirects(
    input: LocalRequestInput,
    controller: AbortController,
  ): Promise<Response> {
    const followRedirects = input.followRedirects ?? true;
    const maxRedirects = input.maxRedirects ?? 10;
    let url = this.buildUrl(input.url, input.queryParams);

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const response = await fetch(url, {
        method: input.method,
        headers: input.headers,
        body: this.buildBody(input),
        signal: controller.signal,
        redirect: followRedirects ? "manual" : "follow",
      });

      if (!followRedirects || !this.isRedirect(response.status)) {
        return response;
      }

      const location = response.headers.get("location");
      if (!location) {
        return response;
      }

      if (redirectCount === maxRedirects) {
        throw new Error("TOO_MANY_REDIRECTS");
      }

      url = new URL(location, url).toString();
    }

    throw new Error("TOO_MANY_REDIRECTS");
  }

  private buildUrl(rawUrl: string, queryParams?: Record<string, string>): string {
    const url = new URL(rawUrl);
    for (const [key, value] of Object.entries(queryParams ?? {})) {
      if (key.trim()) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private buildBody(input: LocalRequestInput): BodyInit | undefined {
    if (input.method === "GET" || input.method === "HEAD" || input.body?.type === "none") {
      return undefined;
    }

    if (input.body?.type === "json") {
      return typeof input.body.value === "string"
        ? input.body.value
        : JSON.stringify(input.body?.value ?? {});
    }

    if (input.body?.type === "text" || input.body?.type === "binary") {
      return String(input.body.value ?? "");
    }

    if (input.body?.type === "x-www-form-urlencoded") {
      const params = new URLSearchParams();
      for (const item of this.formValues(input.body.value)) {
        if (item.enabled && item.key.trim()) {
          params.append(item.key, item.value);
        }
      }

      return params;
    }

    if (input.body?.type === "form-data") {
      const formData = new FormData();
      for (const item of this.formValues(input.body.value)) {
        if (!item.enabled || !item.key.trim()) {
          continue;
        }

        if (item.valueType === "file") {
          const fileBuffer = Buffer.from(
            item.value.includes(",") ? item.value.split(",").pop() ?? "" : item.value,
            "base64",
          );
          formData.append(
            item.key,
            new Blob([fileBuffer], { type: item.mimeType ?? "application/octet-stream" }),
            item.fileName ?? "upload.bin",
          );
        } else {
          formData.append(item.key, item.value);
        }
      }

      return formData;
    }

    throw new Error("UNSUPPORTED_BODY_TYPE");
  }

  private formValues(value: unknown): MultipartFormValue[] {
    return Array.isArray(value) ? value as MultipartFormValue[] : [];
  }

  private isRedirect(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
  }

  private readHeaders(headers: Headers): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;

    headers.forEach((value, key) => {
      result[key] = value;
    });

    if (typeof getSetCookie === "function") {
      const cookies = getSetCookie.call(headers);
      if (cookies.length) {
        result["set-cookie"] = cookies;
      }
    }

    return result;
  }

  private isTextContent(contentType: string): boolean {
    return (
      contentType.startsWith("text/") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("javascript") ||
      contentType.includes("x-www-form-urlencoded")
    );
  }

  private toErrorResponse(id: string, error: unknown): LocalRequestResponse {
    if (error instanceof Error && error.message === "TOO_MANY_REDIRECTS") {
      return this.error(id, "TOO_MANY_REDIRECTS", "Too many redirects.");
    }

    if (error instanceof Error && error.message === "UNSUPPORTED_BODY_TYPE") {
      return this.error(id, "UNSUPPORTED_BODY_TYPE", "Unsupported body type.");
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return this.error(id, "REQUEST_CANCELLED", "Request cancelled.");
    }

    const code = this.readErrorCode(error);
    const message = this.readErrorMessage(error);

    if (code === "ENOTFOUND") {
      return this.error(id, "DNS_LOOKUP_FAILED", "DNS lookup failed.", { cause: message });
    }

    if (code === "ECONNREFUSED") {
      return this.error(id, "CONNECTION_REFUSED", "Connection refused.", { cause: message });
    }

    if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
      return this.error(id, "TIMEOUT", "Request timed out.", { cause: message });
    }

    if (code?.includes("CERT") || code?.includes("TLS") || message.toLowerCase().includes("certificate")) {
      return this.error(id, "TLS_CERTIFICATE_ERROR", "SSL/TLS certificate error.", { cause: message });
    }

    if (code === "ENETUNREACH") {
      return this.error(id, "NETWORK_UNREACHABLE", "Network unreachable.", { cause: message });
    }

    return this.error(id, "NETWORK_ERROR", message);
  }

  private readErrorCode(error: unknown): string | undefined {
    const cause = error instanceof Error
      ? (error as Error & { cause?: { code?: string } }).cause
      : undefined;

    return cause?.code;
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const cause = (error as Error & { cause?: { message?: string } }).cause;
      return cause?.message ?? error.message;
    }

    return "Unknown network error.";
  }

  private error(
    id: string,
    code: string,
    message: string,
    details?: unknown,
  ): LocalRequestResponse {
    return {
      id,
      ok: false,
      error: {
        code,
        message,
        details,
      },
    };
  }
}
