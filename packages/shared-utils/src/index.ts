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

export const stripJsonComments = (value: string): string => {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (inString) {
      result += character;

      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      inString = true;
      result += character;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      result += "  ";
      index += 1;

      while (index + 1 < value.length && value[index + 1] !== "\n") {
        result += " ";
        index += 1;
      }

      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      result += "  ";
      index += 1;

      while (index + 1 < value.length) {
        const commentCharacter = value[index + 1];
        const afterCommentCharacter = value[index + 2];

        if (commentCharacter === "*" && afterCommentCharacter === "/") {
          result += "  ";
          index += 2;
          break;
        }

        result += commentCharacter === "\n" || commentCharacter === "\r"
          ? commentCharacter
          : " ";
        index += 1;
      }

      continue;
    }

    result += character;
  }

  return result;
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
