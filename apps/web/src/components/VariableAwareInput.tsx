import { useEffect, useMemo, useRef, useState } from "react";
import type { EnvironmentVariableSuggestion } from "../services/environmentVariables";
import { getActiveVariableToken } from "../services/environmentVariables";

interface VariableAwareInputProps {
  className?: string;
  placeholder?: string;
  suggestions: EnvironmentVariableSuggestion[];
  value: string;
  wrapperClassName?: string;
  onChange: (value: string) => void;
}

type HighlightedPart =
  | { type: "text"; value: string }
  | {
      type: "variable";
      value: string;
      key: string;
      found: boolean;
      suggestion?: EnvironmentVariableSuggestion;
    };

export function VariableAwareInput({
  className,
  placeholder,
  suggestions,
  value,
  wrapperClassName,
  onChange,
}: VariableAwareInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const activeToken = getActiveVariableToken(value, caretIndex);
  const suggestionByKey = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.key, suggestion])),
    [suggestions],
  );

  const highlightedParts = useMemo(() => {
    const parts: HighlightedPart[] = [];
    let lastIndex = 0;

    for (const match of value.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const key = match[1]?.trim() ?? "";
      const suggestion = suggestionByKey.get(key);

      if (start > lastIndex) {
        parts.push({ type: "text", value: value.slice(lastIndex, start) });
      }

      parts.push({
        type: "variable",
        value: match[0],
        key,
        found: Boolean(suggestion),
        suggestion,
      });
      lastIndex = end;
    }

    if (lastIndex < value.length) {
      parts.push({ type: "text", value: value.slice(lastIndex) });
    }

    return parts.length ? parts : ([{ type: "text", value }] satisfies HighlightedPart[]);
  }, [suggestionByKey, value]);

  const variableTitle = useMemo(
    () =>
      highlightedParts
        .filter((part) => part.type === "variable")
        .map((part) =>
          part.suggestion
            ? `${part.key}: ${part.suggestion.value}`
            : `${part.key}: variable not found`,
        )
        .join("\n"),
    [highlightedParts],
  );

  const filteredSuggestions = useMemo(() => {
    if (activeToken === null) {
      return [];
    }

    const normalizedToken = activeToken.trim().toLowerCase();
    return suggestions
      .filter((suggestion) => suggestion.key.toLowerCase().includes(normalizedToken))
      .slice(0, 8);
  }, [activeToken, suggestions]);
  const showSuggestions = focused && activeToken !== null && filteredSuggestions.length > 0;

  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [activeToken, filteredSuggestions.length]);

  const syncInputState = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    setCaretIndex(input.selectionStart ?? 0);
    if (highlightRef.current) {
      highlightRef.current.scrollLeft = input.scrollLeft;
    }
  };

  const insertSuggestion = (key: string) => {
    const startIndex = value.slice(0, caretIndex).lastIndexOf("{{");
    if (startIndex === -1) {
      return;
    }

    const nextValue = `${value.slice(0, startIndex)}{{${key}}}${value.slice(caretIndex)}`;
    const nextCaretIndex = startIndex + key.length + 4;
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaretIndex, nextCaretIndex);
      setCaretIndex(nextCaretIndex);
      syncInputState();
    });
  };

  const selectHighlightedSuggestion = () => {
    const selectedSuggestion = filteredSuggestions[selectedSuggestionIndex];
    if (!selectedSuggestion) {
      return false;
    }

    insertSuggestion(selectedSuggestion.key);
    return true;
  };

  return (
    <div className={`variable-input ${wrapperClassName ?? ""}`.trim()}>
      <div
        aria-hidden="true"
        className={`${className ?? ""} variable-input__highlight`.trim()}
        ref={highlightRef}
      >
        {highlightedParts.map((part, index) =>
          part.type === "variable" ? (
            <span
              className={`variable-inline ${
                part.found ? "variable-inline--found" : "variable-inline--missing"
              }`}
              key={`${part.value}-${index}`}
            >
              {part.value}
            </span>
          ) : (
            <span key={`text-${index}`}>{part.value || "\u00a0"}</span>
          ),
        )}
      </div>
      <input
        className={`${className ?? ""} variable-input__control`.trim()}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setCaretIndex(event.target.selectionStart ?? event.target.value.length);
          window.requestAnimationFrame(syncInputState);
        }}
        onClick={syncInputState}
        onFocus={() => {
          setFocused(true);
          syncInputState();
        }}
        onKeyDown={(event) => {
          if (!showSuggestions) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedSuggestionIndex((current) =>
              Math.min(current + 1, filteredSuggestions.length - 1),
            );
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedSuggestionIndex((current) => Math.max(current - 1, 0));
          }

          if (event.key === "Enter" || event.key === "Tab") {
            if (selectHighlightedSuggestion()) {
              event.preventDefault();
            }
          }

          if (event.key === "Escape") {
            setFocused(false);
          }
        }}
        onKeyUp={syncInputState}
        onScroll={syncInputState}
        onSelect={syncInputState}
        placeholder={placeholder}
        ref={inputRef}
        spellCheck={false}
        title={variableTitle || undefined}
        value={value}
      />
      {showSuggestions ? (
        <div className="variable-suggestions" role="listbox">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              aria-selected={index === selectedSuggestionIndex}
              className={`variable-suggestion ${
                index === selectedSuggestionIndex ? "is-active" : ""
              }`}
              key={suggestion.key}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertSuggestion(suggestion.key)}
              role="option"
              type="button"
            >
              <span className="variable-suggestion__key">{suggestion.key}</span>
              <span className="variable-suggestion__meta">{suggestion.source}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
