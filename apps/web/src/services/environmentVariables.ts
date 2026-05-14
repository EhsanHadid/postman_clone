import type { EnvironmentDefinition } from "@postman-clone/shared-types";

export interface EnvironmentVariableSuggestion {
  key: string;
  value: string;
  source: string;
}

export interface VariableReference {
  key: string;
  found: boolean;
}

const variablePattern = /\{\{\s*([^{}\s]+)\s*\}\}/g;

export function getEnvironmentVariableSuggestions(
  environments: EnvironmentDefinition[],
  activeEnvironmentId?: string | null,
): EnvironmentVariableSuggestion[] {
  const suggestions = new Map<string, EnvironmentVariableSuggestion>();

  for (const environment of environments) {
    if (!environment.isGlobal && environment.id !== activeEnvironmentId) {
      continue;
    }

    for (const variable of environment.variables) {
      const key = variable.key.trim();
      if (!variable.enabled || !key) {
        continue;
      }

      suggestions.set(key, {
        key,
        value: variable.value,
        source: environment.isGlobal ? "Global" : environment.name,
      });
    }
  }

  return [...suggestions.values()].sort((first, second) =>
    first.key.localeCompare(second.key),
  );
}

export function findVariableReferences(
  value: string,
  suggestions: EnvironmentVariableSuggestion[],
): VariableReference[] {
  const knownKeys = new Set(suggestions.map((suggestion) => suggestion.key));
  const references = new Map<string, VariableReference>();

  for (const match of value.matchAll(variablePattern)) {
    const key = match[1]?.trim();
    if (!key) {
      continue;
    }

    references.set(key, {
      key,
      found: knownKeys.has(key),
    });
  }

  return [...references.values()];
}

export function getActiveVariableToken(value: string, caretIndex: number): string | null {
  const beforeCaret = value.slice(0, caretIndex);
  const startIndex = beforeCaret.lastIndexOf("{{");

  if (startIndex === -1) {
    return null;
  }

  const afterStart = beforeCaret.slice(startIndex + 2);
  if (afterStart.includes("}}") || afterStart.includes("{") || afterStart.includes("}")) {
    return null;
  }

  return afterStart.trimStart();
}
