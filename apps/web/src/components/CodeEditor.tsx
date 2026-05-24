import Editor from "@monaco-editor/react";
import type { EnvironmentVariableSuggestion } from "../services/environmentVariables";

interface CodeEditorProps {
  value: string;
  language: string;
  height?: number | string;
  readOnly?: boolean;
  allowJsonComments?: boolean;
  variableSuggestions?: EnvironmentVariableSuggestion[];
  onChange?: (value: string) => void;
}

export function CodeEditor({
  value,
  language,
  height = 260,
  readOnly = false,
  allowJsonComments = false,
  variableSuggestions = [],
  onChange,
}: CodeEditorProps) {
  return (
    <div className="editor-shell">
      <Editor
        theme="vs-dark"
        language={language}
        height={height}
        value={value}
        beforeMount={(monaco) => {
          if (language === "json" && allowJsonComments) {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              allowComments: true,
            });
          }

          monaco.languages.registerCompletionItemProvider(language, {
            triggerCharacters: ["{"],
            provideCompletionItems: (model, position) => {
              const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              });
              const match = textUntilPosition.match(/\{\{\s*([^{}]*)$/);

              if (!match) {
                return { suggestions: [] };
              }

              const token = (match[1] ?? "").trim().toLowerCase();
              const wordStartColumn = position.column - (match[1]?.length ?? 0);
              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordStartColumn,
                endColumn: position.column,
              };

              return {
                suggestions: variableSuggestions
                  .filter((suggestion) => suggestion.key.toLowerCase().includes(token))
                  .slice(0, 16)
                  .map((suggestion) => ({
                    label: suggestion.key,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    detail: suggestion.source,
                    documentation: suggestion.value,
                    insertText: `${suggestion.key}}}`,
                    range,
                  })),
              };
            },
          });
        }}
        onMount={(editor, monaco) => {
          let decorationIds: string[] = [];
          const applyDecorations = () => {
            const model = editor.getModel();
            if (!model) {
              return;
            }

            const knownKeys = new Set(variableSuggestions.map((suggestion) => suggestion.key));
            const suggestionByKey = new Map(
              variableSuggestions.map((suggestion) => [suggestion.key, suggestion]),
            );
            const decorations = [...model.getValue().matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)]
              .map((match) => {
                const key = match[1]?.trim() ?? "";
                const suggestion = suggestionByKey.get(key);
                const start = match.index ?? 0;
                const end = start + match[0].length;
                const startPosition = model.getPositionAt(start);
                const endPosition = model.getPositionAt(end);

                return {
                  range: new monaco.Range(
                    startPosition.lineNumber,
                    startPosition.column,
                    endPosition.lineNumber,
                    endPosition.column,
                  ),
                  options: {
                    inlineClassName: knownKeys.has(key)
                      ? "monaco-variable-found"
                      : "monaco-variable-missing",
                    hoverMessage: {
                      value: suggestion
                        ? `\`${key}\` = \`${suggestion.value}\``
                        : `Variable not found: \`${key}\``,
                    },
                  },
                };
              });

            decorationIds = editor.deltaDecorations(decorationIds, decorations);
          };

          applyDecorations();
          editor.onDidChangeModelContent(applyDecorations);
        }}
        onChange={(nextValue) => onChange?.(nextValue ?? "")}
        options={{
          minimap: { enabled: false },
          readOnly,
          fontSize: 13,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: {
            top: 10,
          },
        }}
      />
    </div>
  );
}
