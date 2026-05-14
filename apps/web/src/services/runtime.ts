const defaultDesktopApiBase = "https://postman.mahac.af/api";

export function isDesktopRenderer(): boolean {
  return window.location.protocol === "file:" || Boolean(window.desktopApi);
}

export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    (isDesktopRenderer() ? defaultDesktopApiBase : "/api")
  );
}

export function isPrivateNetworkUrl(rawUrl: string): boolean {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  const ipv4Parts = hostname.split(".").map((part) => Number(part));
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [first, second] = ipv4Parts;
    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254)
    );
  }

  return (
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan")
  );
}
