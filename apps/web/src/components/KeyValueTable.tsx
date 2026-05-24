import type { KeyValueItem, MultipartFormValue } from "@postman-clone/shared-types";
import type { EnvironmentVariableSuggestion } from "../services/environmentVariables";
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
                updateRow(index, { valueType: event.target.value as "text" | "file" } as T)
              }
            >
              <option value="text">Text</option>
              <option value="file">File (Base64)</option>
            </select>
          ) : null}
          <VariableAwareInput
            className="input input--dense"
            value={row.value}
            placeholder={
              mode === "formData" && (row as MultipartFormValue).valueType === "file"
                ? "Paste base64 or data URL"
                : "Value"
            }
            suggestions={variableSuggestions}
            onChange={(value) => updateRow(index, { value } as T)}
          />
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
