import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  language: string;
  height?: number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export function CodeEditor({
  value,
  language,
  height = 260,
  readOnly = false,
  onChange,
}: CodeEditorProps) {
  return (
    <div className="editor-shell">
      <Editor
        theme="vs-dark"
        language={language}
        height={height}
        value={value}
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
