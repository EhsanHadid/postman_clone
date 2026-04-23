type Interpolatable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Interpolatable[]
  | { [key: string]: Interpolatable };

export const interpolateTemplate = (
  template: string,
  values: Record<string, string>,
): string =>
  template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    return values[key] ?? "";
  });

export const interpolateObject = <T extends Interpolatable>(
  value: T,
  variables: Record<string, string>,
): T => {
  if (typeof value === "string") {
    return interpolateTemplate(value, variables) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateObject(item, variables)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, Interpolatable> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = interpolateObject(item, variables);
    }

    return next as T;
  }

  return value;
};

export const toEnabledRecord = (
  pairs: Array<{ key: string; value: string; enabled?: boolean }>,
): Record<string, string> =>
  pairs.reduce<Record<string, string>>((accumulator, pair) => {
    if (pair.enabled !== false && pair.key.trim()) {
      accumulator[pair.key.trim()] = pair.value;
    }

    return accumulator;
  }, {});

export const safeJsonParse = <T>(
  value: string,
  fallback: T,
): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const createSortOrder = (index: number): number => index * 100;

export const uniqueBy = <T>(
  items: T[],
  keySelector: (item: T) => string,
): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keySelector(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};
