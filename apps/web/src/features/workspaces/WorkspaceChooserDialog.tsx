import { useState } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";

interface WorkspaceChooserDialogProps {
  canClose: boolean;
  onClose: () => void;
}

export function WorkspaceChooserDialog({ canClose, onClose }: WorkspaceChooserDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);

  const selectWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    onClose();
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createWorkspace(name.trim(), description.trim());
      setName("");
      setDescription("");
      onClose();
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="workspace-gate-backdrop" role="presentation">
      <section className="workspace-gate" role="dialog" aria-modal="true">
        <header className="workspace-gate__header">
          <div>
            <h2>Choose a workspace</h2>
            <p>Select a workspace to enter, or create a new one.</p>
          </div>
          {canClose ? (
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
              x
            </button>
          ) : null}
        </header>

        <div className="workspace-gate__body">
          <div className="workspace-gate__list">
            {workspaces.length ? (
              workspaces.map((workspace) => (
                <button
                  className={
                    workspace.id === activeWorkspaceId
                      ? "workspace-choice is-active"
                      : "workspace-choice"
                  }
                  key={workspace.id}
                  onClick={() => selectWorkspace(workspace.id)}
                  type="button"
                >
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{workspace.description || "No description"}</small>
                  </span>
                  <span className="badge">{workspace.currentUserRole}</span>
                </button>
              ))
            ) : (
              <div className="workspace-empty workspace-empty--small">
                No workspaces yet. Create your first workspace to continue.
              </div>
            )}
          </div>

          <div className="workspace-create-panel">
            <h3>Create workspace</h3>
            <label className="dialog__field">
              <span>Name</span>
              <input
                className="input"
                placeholder="My Workspace"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="dialog__field">
              <span>Description</span>
              <textarea
                className="textarea"
                placeholder="Optional"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            {error ? <div className="dialog__error">{error}</div> : null}
            <button
              className="button button-primary"
              disabled={submitting}
              onClick={() => void submit()}
              type="button"
            >
              Create and enter
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
