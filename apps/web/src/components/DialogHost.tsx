import { useEffect, useMemo, useState } from "react";
import type { CollectionTree, CollectionTreeFolder } from "@postman-clone/shared-types";
import { CloseIcon, CollectionIcon, FolderIcon } from "./AppIcons";
import { useCollectionsStore } from "../store/collectionsStore";
import { useDialogStore } from "../store/dialogStore";

interface FlattenedFolder {
  id: string;
  label: string;
}

const NEW_COLLECTION_VALUE = "__new_collection__";

function flattenFolders(
  folders: CollectionTreeFolder[],
  depth = 0,
): FlattenedFolder[] {
  return folders.flatMap((folder) => [
    {
      id: folder.id,
      label: `${"  ".repeat(depth)}${folder.name}`,
    },
    ...flattenFolders(folder.folders, depth + 1),
  ]);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function DialogHost() {
  const dialog = useDialogStore((state) => state.dialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const collections = useCollectionsStore((state) => state.collections);
  const [textValue, setTextValue] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [valueValue, setValueValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSubmitting(false);
    setError("");

    if (!dialog) {
      return;
    }

    if (dialog.kind === "text") {
      setTextValue(dialog.initialValue ?? "");
    }

    if (dialog.kind === "keyValue") {
      setKeyValue(dialog.initialKey ?? "");
      setValueValue(dialog.initialValue ?? "");
    }

    if (dialog.kind === "saveLocation") {
      const defaultCollectionId =
        dialog.initialCollectionId || collections[0]?.id || NEW_COLLECTION_VALUE;

      setNameValue(dialog.initialName ?? "Untitled Request");
      setSelectedCollectionId(defaultCollectionId);
      setSelectedFolderId(dialog.initialFolderId ?? null);
      setNewCollectionName("");
    }
  }, [collections, dialog]);

  const selectedCollection = useMemo(() => {
    if (!dialog || dialog.kind !== "saveLocation") {
      return null;
    }

    return collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  }, [collections, dialog, selectedCollectionId]);

  const folderOptions = useMemo(
    () => (selectedCollection ? flattenFolders(selectedCollection.folders) : []),
    [selectedCollection],
  );

  useEffect(() => {
    if (!dialog || dialog.kind !== "saveLocation") {
      return;
    }

    if (selectedCollectionId === NEW_COLLECTION_VALUE) {
      setSelectedFolderId(null);
      return;
    }

    if (!folderOptions.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [dialog, folderOptions, selectedCollectionId, selectedFolderId]);

  if (!dialog) {
    return null;
  }

  const submit = async () => {
    setError("");
    setSubmitting(true);

    try {
      if (dialog.kind === "text") {
        await dialog.onSubmit(textValue.trim());
      }

      if (dialog.kind === "confirm") {
        await dialog.onConfirm();
      }

      if (dialog.kind === "keyValue") {
        await dialog.onSubmit({
          key: keyValue.trim(),
          value: valueValue,
        });
      }

      if (dialog.kind === "saveLocation") {
        const name = nameValue.trim();
        const isCreatingCollection = selectedCollectionId === NEW_COLLECTION_VALUE;
        const collectionName = newCollectionName.trim();

        if (!name) {
          throw new Error("Request name is required.");
        }

        if (!selectedCollectionId) {
          throw new Error("Select a collection first.");
        }

        if (isCreatingCollection && !collectionName) {
          throw new Error("Enter a name for the new collection.");
        }

        await dialog.onSubmit({
          name,
          collectionId: isCreatingCollection ? "" : selectedCollectionId,
          folderId: isCreatingCollection ? null : selectedFolderId,
          newCollectionName: isCreatingCollection ? collectionName : undefined,
        });
      }

      closeDialog();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="dialog__header">
          <div className="dialog__title-wrap">
            <h3>{dialog.title}</h3>
            {"description" in dialog && dialog.description ? (
              <div className="dialog__description">{dialog.description}</div>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="icon-button"
            disabled={submitting}
            onClick={closeDialog}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="dialog__content">
          {dialog.kind === "notice" ? (
            <div className="dialog__notice">{dialog.description}</div>
          ) : null}

          {dialog.kind === "confirm" ? (
            <div className="dialog__notice">{dialog.description}</div>
          ) : null}

          {dialog.kind === "text" ? (
            <label className="dialog__field">
              <span>{dialog.label}</span>
              <input
                autoFocus
                className="input"
                onChange={(event) => setTextValue(event.target.value)}
                placeholder={dialog.placeholder}
                value={textValue}
              />
            </label>
          ) : null}

          {dialog.kind === "keyValue" ? (
            <div className="dialog__form-grid">
              <label className="dialog__field">
                <span>{dialog.keyLabel}</span>
                <input
                  autoFocus
                  className="input"
                  onChange={(event) => setKeyValue(event.target.value)}
                  placeholder={dialog.keyPlaceholder}
                  value={keyValue}
                />
              </label>
              <label className="dialog__field">
                <span>{dialog.valueLabel}</span>
                <input
                  className="input"
                  onChange={(event) => setValueValue(event.target.value)}
                  placeholder={dialog.valuePlaceholder}
                  value={valueValue}
                />
              </label>
            </div>
          ) : null}

          {dialog.kind === "saveLocation" ? (
            <div className="dialog__form-grid">
              <label className="dialog__field dialog__field--wide">
                <span>Request name</span>
                <input
                  autoFocus
                  className="input"
                  onChange={(event) => setNameValue(event.target.value)}
                  value={nameValue}
                />
              </label>

              <label className="dialog__field">
                <span>Collection</span>
                <select
                  className="select"
                  onChange={(event) => setSelectedCollectionId(event.target.value)}
                  value={selectedCollectionId}
                >
                  {collections.map((collection: CollectionTree) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                  <option value={NEW_COLLECTION_VALUE}>Create new collection</option>
                </select>
              </label>

              {selectedCollectionId === NEW_COLLECTION_VALUE ? (
                <label className="dialog__field dialog__field--wide">
                  <span>New collection name</span>
                  <input
                    className="input"
                    onChange={(event) => setNewCollectionName(event.target.value)}
                    placeholder="Core APIs"
                    value={newCollectionName}
                  />
                </label>
              ) : null}

              {selectedCollectionId !== NEW_COLLECTION_VALUE ? (
                <label className="dialog__field">
                  <span>Folder</span>
                  <select
                    className="select"
                    onChange={(event) =>
                      setSelectedFolderId(event.target.value ? event.target.value : null)
                    }
                    value={selectedFolderId ?? ""}
                  >
                    <option value="">Collection root</option>
                    {folderOptions.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="dialog__location-preview">
                <div className="dialog__location-row">
                  <CollectionIcon />
                  <span>
                    {selectedCollectionId === NEW_COLLECTION_VALUE
                      ? newCollectionName.trim() || "New collection"
                      : selectedCollection?.name || "No collection selected"}
                  </span>
                </div>
                {selectedCollectionId !== NEW_COLLECTION_VALUE && selectedFolderId ? (
                  <div className="dialog__location-row">
                    <FolderIcon />
                    <span>
                      {folderOptions.find((folder) => folder.id === selectedFolderId)?.label.trim()}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <div className="dialog__error">{error}</div> : null}
        </div>

        <footer className="dialog__footer">
          {dialog.kind !== "notice" ? (
            <button
              className="button button-subtle"
              disabled={submitting}
              onClick={closeDialog}
              type="button"
            >
              {dialog.kind === "confirm" ? dialog.cancelLabel || "Cancel" : "Cancel"}
            </button>
          ) : null}
          {dialog.kind === "notice" && dialog.actionUrl ? (
            <a
              className="button button-subtle"
              href={dialog.actionUrl}
              rel="noreferrer"
              target="_blank"
            >
              {dialog.actionLabel ?? "Open link"}
            </a>
          ) : null}
          <button
            className={`button button-primary ${
              dialog.kind === "confirm" && dialog.tone === "danger" ? "button-danger" : ""
            }`}
            disabled={submitting}
            onClick={() => void submit()}
            type="button"
          >
            {submitting
              ? "Saving..."
              : dialog.kind === "notice"
                ? dialog.confirmLabel || "Close"
                : dialog.kind === "confirm"
                  ? dialog.confirmLabel || "Confirm"
                : dialog.submitLabel || "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
