import { create } from "zustand";

interface NoticeDialogConfig {
  kind: "notice";
  title: string;
  description: string;
  confirmLabel?: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface ConfirmDialogConfig {
  kind: "confirm";
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
}

interface TextDialogConfig {
  kind: "text";
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => Promise<void> | void;
}

interface KeyValueDialogConfig {
  kind: "keyValue";
  title: string;
  description?: string;
  keyLabel?: string;
  valueLabel?: string;
  initialKey?: string;
  initialValue?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  submitLabel?: string;
  onSubmit: (payload: { key: string; value: string }) => Promise<void> | void;
}

interface SaveLocationDialogConfig {
  kind: "saveLocation";
  title: string;
  description?: string;
  initialName?: string;
  initialCollectionId?: string;
  initialFolderId?: string | null;
  submitLabel?: string;
  onSubmit: (payload: {
    name: string;
    collectionId: string;
    folderId: string | null;
    newCollectionName?: string;
  }) => Promise<void> | void;
}

export type DialogConfig =
  | NoticeDialogConfig
  | ConfirmDialogConfig
  | TextDialogConfig
  | KeyValueDialogConfig
  | SaveLocationDialogConfig;

interface DialogStore {
  dialog: DialogConfig | null;
  openNoticeDialog: (config: Omit<NoticeDialogConfig, "kind">) => void;
  openConfirmDialog: (config: Omit<ConfirmDialogConfig, "kind">) => void;
  openTextDialog: (config: Omit<TextDialogConfig, "kind">) => void;
  openKeyValueDialog: (config: Omit<KeyValueDialogConfig, "kind">) => void;
  openSaveLocationDialog: (config: Omit<SaveLocationDialogConfig, "kind">) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  dialog: null,
  openNoticeDialog: (config) =>
    set({
      dialog: {
        kind: "notice",
        confirmLabel: "Close",
        ...config,
      },
    }),
  openConfirmDialog: (config) =>
    set({
      dialog: {
        kind: "confirm",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "default",
        ...config,
      },
    }),
  openTextDialog: (config) =>
    set({
      dialog: {
        kind: "text",
        submitLabel: "Save",
        ...config,
      },
    }),
  openKeyValueDialog: (config) =>
    set({
      dialog: {
        kind: "keyValue",
        keyLabel: "Key",
        valueLabel: "Value",
        submitLabel: "Save",
        ...config,
      },
    }),
  openSaveLocationDialog: (config) =>
    set({
      dialog: {
        kind: "saveLocation",
        submitLabel: "Save Request",
        ...config,
      },
    }),
  closeDialog: () => set({ dialog: null }),
}));
