import type { KeyValueItem, MultipartFormValue } from "@postman-clone/shared-types";
import type { EnvironmentVariableSuggestion } from "../services/environmentVariables";
import { readFileAsDataUrl } from "../services/files";
import { UploadIcon } from "./AppIcons";
import { VariableAwareInput } from "./VariableAwareInput";

type TableRow = KeyValueItem | MultipartFormValue;

interface KeyValueTableProps<T extends TableRow> {
  rows: T[];
  mode?: "standard" | "formData";
  variableSuggestions?: EnvironmentVariableSuggestion[];
  onChange: (rows: T[]) => void;
}

const nextRowId = () => crypto.randomUUID();

export function KeyValueTable<T extends TableRow>({
  rows,
  mode = "standard",
  variableSuggestions = [],
  onChange,
}: KeyValueTableProps<T>) {
  const updateRow = (index: number, patch: Partial<T>) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? ({ ...row, ...patch } as T) : row,
    );
    onChange(nextRows);
  };

  const addRow = () => {
    const baseRow = {
      id: nextRowId(),
      key: "",
      value: "",
      enabled: true,
      description: "",
    } as T;

    onChange([...rows, baseRow]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const selectFile = async (index: number, file: File | undefined) => {
    if (!file) {
      return;
    }

    const value = await readFileAsDataUrl(file);
    updateRow(index, {
      value,
      valueType: "file",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    } as unknown as Partial<T>);
  };

  return (
    <div className={`kv-table ${mode === "formData" ? "kv-table--formdata" : "kv-table--standard"}`}>
      <div className="kv-table__header">
        <span>Enabled</span>
        <span>Key</span>
        {mode === "formData" ? <span>Type</span> : null}
        <span>Value</span>
        <span>Description</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div className="kv-table__row" key={row.id || index}>
          <label className="kv-table__checkbox">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(event) => updateRow(index, { enabled: event.target.checked } as T)}
            />
          </label>
          <VariableAwareInput
            className="input input--dense"
            value={row.key}
            placeholder="Key"
            suggestions={variableSuggestions}
            onChange={(key) => updateRow(index, { key } as T)}
          />
          {mode === "formData" ? (
            <select
              className="select select--compact"
              value={(row as MultipartFormValue).valueType ?? "text"}
              onChange={(event) =>
                updateRow(index, {
                  valueType: event.target.value as "text" | "file",
                  ...(event.target.value === "text"
                    ? { fileName: undefined, mimeType: undefined }
                    : {}),
                } as unknown as Partial<T>)
              }
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          ) : null}
          {mode === "formData" && (row as MultipartFormValue).valueType === "file" ? (
            <div className="file-picker">
              <input
                className="file-picker__input"
                type="file"
                onChange={(event) => {
                  void selectFile(index, event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button className="file-picker__button" type="button">
                <UploadIcon />
                <span>{(row as MultipartFormValue).fileName ? "Replace file" : "Select file"}</span>
              </button>
              <span className="file-picker__name">
                {(row as MultipartFormValue).fileName ?? "No file selected"}
              </span>
            </div>
          ) : (
            <VariableAwareInput
              className="input input--dense"
              value={row.value}
              placeholder="Value"
              suggestions={variableSuggestions}
              onChange={(value) => updateRow(index, { value } as T)}
            />
          )}
          <VariableAwareInput
            className="input input--dense"
            value={row.description ?? ""}
            placeholder="Description"
            suggestions={variableSuggestions}
            onChange={(description) => updateRow(index, { description } as T)}
          />
          <button
            className="text-action text-action--quiet"
            onClick={() => removeRow(index)}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}
      <button className="text-action text-action--accent" onClick={addRow} type="button">
        Add row
      </button>
    </div>
  );
}
