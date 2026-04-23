import { api } from "../../services/api";
import { Drawer } from "../../components/Drawer";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useLayoutStore } from "../../store/layoutStore";

export function EnvironmentDrawer() {
  const open = useLayoutStore((state) => state.showEnvironments);
  const toggle = useLayoutStore((state) => state.toggleEnvironments);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);

  const createEnvironment = async () => {
    const name = window.prompt("Environment name");
    if (!name) {
      return;
    }

    await api.environments.create({ name });
    await fetchEnvironments();
  };

  const addVariable = async (environmentId: string) => {
    const key = window.prompt("Variable key");
    const value = window.prompt("Variable value");

    if (!key || value === null) {
      return;
    }

    await api.environments.addVariable(environmentId, {
      key,
      value,
      enabled: true,
    });
    await fetchEnvironments();
  };

  const editVariable = async (
    variableId: string,
    currentKey: string,
    currentValue: string,
  ) => {
    const key = window.prompt("Variable key", currentKey);
    const value = window.prompt("Variable value", currentValue);

    if (!key || value === null) {
      return;
    }

    await api.environments.updateVariable(variableId, { key, value, enabled: true });
    await fetchEnvironments();
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
