import { api } from "../../services/api";
import { Drawer } from "../../components/Drawer";
import { useDialogStore } from "../../store/dialogStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useWorkspaceStore } from "../../store/workspaceStore";

export function EnvironmentDrawer() {
  const open = useLayoutStore((state) => state.showEnvironments);
  const toggle = useLayoutStore((state) => state.toggleEnvironments);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const openTextDialog = useDialogStore((state) => state.openTextDialog);
  const openKeyValueDialog = useDialogStore((state) => state.openKeyValueDialog);
  const renameEnvironment = (environmentId: string, currentName: string) => {
    openTextDialog({
      title: "Edit Environment",
      description: "Rename this environment without changing its variables.",
      label: "Environment name",
      initialValue: currentName,
      submitLabel: "Save Environment",
      onSubmit: async (name) => {
        await api.environments.update(environmentId, { name });
        await fetchEnvironments();
      },
    });
  };

  const makeGlobal = async (environmentId: string) => {
    await api.environments.update(environmentId, { isGlobal: true });
    setActiveEnvironment(environmentId);
    await fetchEnvironments();
  };

  const createEnvironment = async () => {
    if (!activeWorkspaceId) {
      return;
    }

    openTextDialog({
      title: "New Environment",
      description: "Create an environment for API variables and tokens.",
      label: "Environment name",
      initialValue: "New Environment",
      submitLabel: "Create Environment",
      onSubmit: async (name) => {
        await api.environments.createInWorkspace(activeWorkspaceId, { name });
        await fetchEnvironments();
      },
    });
  };

  const addVariable = async (environmentId: string) => {
    openKeyValueDialog({
      title: "Add Variable",
      description: "Add a key-value pair to this environment.",
      keyPlaceholder: "base_url",
      valuePlaceholder: "https://api.example.com",
      submitLabel: "Add Variable",
      onSubmit: async ({ key, value }) => {
        await api.environments.addVariable(environmentId, {
          key,
          value,
          enabled: true,
        });
        await fetchEnvironments();
      },
    });
  };

  const editVariable = async (
    variableId: string,
    currentKey: string,
    currentValue: string,
  ) => {
    openKeyValueDialog({
      title: "Edit Variable",
      description: "Update this environment variable.",
      initialKey: currentKey,
      initialValue: currentValue,
      submitLabel: "Save Variable",
      onSubmit: async ({ key, value }) => {
        await api.environments.updateVariable(variableId, { key, value, enabled: true });
        await fetchEnvironments();
      },
    });
  };

  return (
    <Drawer title="Environments" open={open} onClose={toggle}>
      <button className="button button-primary" onClick={() => void createEnvironment()} type="button">
        New Environment
      </button>

      <div className="drawer-stack">
        {environments.map((environment) => (
          <div className="drawer-card" key={environment.id}>
            <div className="drawer-card__header">
              <div>
                <strong>{environment.name}</strong>
                {environment.isGlobal ? <span className="drawer-card__meta">Global</span> : null}
              </div>
              <div className="drawer-card__actions">
                <button
                  className="button button-subtle"
                  onClick={() => setActiveEnvironment(environment.id)}
                  type="button"
                >
                  {activeEnvironmentId === environment.id ? "Active" : "Use"}
                </button>
                <button
                  className="button button-subtle"
                  onClick={() => void addVariable(environment.id)}
                  type="button"
                >
                  + Variable
                </button>
                <button
                  className="button button-subtle"
                  onClick={() => renameEnvironment(environment.id, environment.name)}
                  type="button"
                >
                  Edit
                </button>
                {!environment.isGlobal ? (
                  <button
                    className="button button-subtle"
                    onClick={() => void makeGlobal(environment.id)}
                    type="button"
                  >
                    Make Global
                  </button>
                ) : null}
              </div>
            </div>

            <div className="drawer-list">
              {environment.variables.map((variable) => (
                <div className="drawer-list__row" key={variable.id}>
                  <div>
                    <div>{variable.key}</div>
                    <small>{variable.value}</small>
                  </div>
                  <div className="drawer-card__actions">
                    <button
                      className="button button-subtle"
                      onClick={() => void editVariable(variable.id, variable.key, variable.value)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-subtle"
                      onClick={async () => {
                        await api.environments.deleteVariable(variable.id);
                        await fetchEnvironments();
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
