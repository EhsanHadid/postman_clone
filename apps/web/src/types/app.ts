import type {
  EditorTabKey,
  ExecutionResponsePayload,
  RequestDefinition,
} from "@postman-clone/shared-types";

export interface RequestTabState {
  id: string;
  requestId: string | null;
  title: string;
  isDirty: boolean;
  isSending: boolean;
  activeEditorTab: EditorTabKey;
  draft: RequestDefinition;
  response: ExecutionResponsePayload | null;
}
