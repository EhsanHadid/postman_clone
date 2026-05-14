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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [focused, setFocused] = useState(false);
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
  const filteredSuggestions = useMemo(() => {
    if (activeToken === null) {
      return [];
    }

    const normalizedToken = activeToken.toLowerCase();
    return suggestions
      .filter((suggestion) => suggestion.key.toLowerCase().includes(normalizedToken))
      .slice(0, 8);
  }, [activeToken, suggestions]);
  const showSuggestions = focused && activeToken !== null && filteredSuggestions.length > 0;

  const getCaretIndex = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor || selection.rangeCount === 0) {
      return 0;
    }

    const range = selection.getRangeAt(0);
    const clone = range.cloneRange();
    clone.selectNodeContents(editor);
    clone.setEnd(range.endContainer, range.endOffset);
    return clone.toString().length;
  };

  const setEditorCaret = (index: number) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    let remaining = index;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      const textLength = node.textContent?.length ?? 0;
      if (remaining <= textLength) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }

      remaining -= textLength;
      node = walker.nextNode();
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const syncCaret = () => {
    setCaretIndex(getCaretIndex());
  };

  const insertSuggestion = (key: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const startIndex = value.slice(0, caretIndex).lastIndexOf("{{");
    if (startIndex === -1) {
      return;
    }

    const nextValue = `${value.slice(0, startIndex)}{{${key}}}${value.slice(caretIndex)}`;
    const nextCaretIndex = startIndex + key.length + 4;
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      editor.focus();
      setEditorCaret(nextCaretIndex);
      setCaretIndex(nextCaretIndex);
    });
  };

  useEffect(() => {
    if (!focused) {
      return;
    }

    window.requestAnimationFrame(() => setEditorCaret(caretIndex));
  }, [caretIndex, focused, value]);

  return (
    <div className={`variable-input ${wrapperClassName ?? ""}`.trim()}>
      <div
        className={`${className ?? ""} variable-input__editor`.trim()}
        contentEditable
        data-placeholder={placeholder}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onClick={syncCaret}
        onFocus={() => {
          setFocused(true);
          syncCaret();
        }}
        onInput={(event) => {
          const nextValue = event.currentTarget.textContent ?? "";
          const nextCaretIndex = getCaretIndex();
          onChange(nextValue);
          setCaretIndex(nextCaretIndex);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        onKeyUp={syncCaret}
        onPaste={(event) => {
          event.preventDefault();
          const pastedText = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, pastedText);
        }}
        ref={editorRef}
        role="textbox"
        spellCheck={false}
        suppressContentEditableWarning
      >
        {highlightedParts.map((part, index) =>
          part.type === "variable" ? (
            <span
              className={`variable-inline ${
                part.found ? "variable-inline--found" : "variable-inline--missing"
              }`}
              key={`${part.value}-${index}`}
              title={
                part.suggestion
                  ? `${part.key}: ${part.suggestion.value}`
                  : `${part.key}: variable not found`
              }
            >
              {part.value}
            </span>
          ) : (
            <span key={`text-${index}`}>{part.value}</span>
          ),
        )}
      </div>
      {showSuggestions ? (
        <div className="variable-suggestions" role="listbox">
          {filteredSuggestions.map((suggestion) => (
            <button
              className="variable-suggestion"
              key={suggestion.key}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertSuggestion(suggestion.key)}
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
