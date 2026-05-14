import { useEffect, useMemo, useState } from "react";
import type { PublicUserProfile, WorkspaceRole } from "@postman-clone/shared-types";
import { ImportExportControls } from "../import-export/ImportExportControls";
import { api } from "../../services/api";
import { useWorkspaceStore, workspacePermissions } from "../../store/workspaceStore";

interface WorkspaceSettingsDialogProps {
  onClose: () => void;
}

type SettingsTab = "general" | "members";
type MemberFilter = "ALL" | WorkspaceRole;

export function WorkspaceSettingsDialog({ onClose }: WorkspaceSettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>("general");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("ALL");
  const [memberRole, setMemberRole] = useState<Exclude<WorkspaceRole, "OWNER">>("CONTRIBUTOR");
  const [userResults, setUserResults] = useState<PublicUserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const members = useWorkspaceStore((state) => state.members);
  const fetchMembers = useWorkspaceStore((state) => state.fetchMembers);
  const addMember = useWorkspaceStore((state) => state.addMember);
  const updateMember = useWorkspaceStore((state) => state.updateMember);
  const removeMember = useWorkspaceStore((state) => state.removeMember);
  const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;
  const role = activeWorkspace?.currentUserRole ?? null;
  const canUpdateWorkspace = workspacePermissions.canUpdateWorkspace(role);
  const canDeleteWorkspace = workspacePermissions.canDeleteWorkspace(role);
  const canManageMembers = workspacePermissions.canManageMembers(role);
  const canManageAdmins = workspacePermissions.canManageAdmins(role);
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name ?? "");
  const [workspaceDescription, setWorkspaceDescription] = useState(
    activeWorkspace?.description ?? "",
  );

  useEffect(() => {
    setWorkspaceName(activeWorkspace?.name ?? "");
    setWorkspaceDescription(activeWorkspace?.description ?? "");
  }, [activeWorkspace?.description, activeWorkspace?.name]);

  useEffect(() => {
    if (canManageMembers) {
      void fetchMembers();
    }
  }, [canManageMembers, fetchMembers]);

  const visibleMembers = useMemo(
    () => members.filter((member) => memberFilter === "ALL" || member.role === memberFilter),
    [memberFilter, members],
  );

  const searchUsers = async () => {
    if (!memberQuery.trim() || !activeWorkspaceId) {
      setUserResults([]);
      return;
    }

    setError(null);
    try {
      setUserResults(await api.users.search(memberQuery, activeWorkspaceId));
    } catch (searchError) {
      setError((searchError as Error).message);
    }
  };

  const saveGeneral = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateWorkspace({
        name: workspaceName.trim(),
        description: workspaceDescription.trim(),
      });
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeWorkspace = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteWorkspace();
      onClose();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-settings-backdrop" role="presentation">
      <section className="workspace-settings" role="dialog" aria-modal="true">
        <aside className="workspace-settings__tabs">
          <div className="workspace-settings__title">
            <strong>{activeWorkspace?.name ?? "Workspace"}</strong>
            <span>{role ?? "No role"}</span>
          </div>
          <button
            className={tab === "general" ? "settings-tab is-active" : "settings-tab"}
            onClick={() => setTab("general")}
            type="button"
          >
            General
          </button>
          <button
            className={tab === "members" ? "settings-tab is-active" : "settings-tab"}
            onClick={() => setTab("members")}
            type="button"
          >
            Members
          </button>
        </aside>

        <div className="workspace-settings__main">
          <header className="workspace-settings__header">
            <div>
              <h2>{tab === "general" ? "General settings" : "Member access"}</h2>
              <p>
                {tab === "general"
                  ? "Manage the workspace profile and owner-only actions."
                  : "Search existing users, filter members, and update roles."}
              </p>
            </div>
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
              x
            </button>
          </header>

          {error ? <div className="dialog__error workspace-settings__error">{error}</div> : null}

          {tab === "general" ? (
            <div className="workspace-settings__content">
              <label className="dialog__field">
                <span>Name</span>
                <input
                  className="input"
                  disabled={!canUpdateWorkspace}
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
              </label>
              <label className="dialog__field">
                <span>Description</span>
                <textarea
                  className="textarea"
                  disabled={!canUpdateWorkspace}
                  rows={5}
                  value={workspaceDescription}
                  onChange={(event) => setWorkspaceDescription(event.target.value)}
                />
              </label>
              <button
                className="button button-primary"
                disabled={!canUpdateWorkspace || saving}
                onClick={() => void saveGeneral()}
                type="button"
              >
                Save changes
              </button>
              <div className="workspace-import-panel">
                <div>
                  <strong>Import data</strong>
                  <p>Bring collections, environments, or backups into this workspace.</p>
                </div>
                <ImportExportControls variant="menu" />
              </div>
              <div className="workspace-danger">
                <div>
                  <strong>Delete workspace</strong>
                  <p>Only the owner can delete this workspace.</p>
                </div>
                <button
                  className="button button-subtle"
                  disabled={!canDeleteWorkspace || saving}
                  onClick={() => void removeWorkspace()}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="workspace-settings__content workspace-settings__content--members">
              {canManageMembers ? (
                <div className="member-search-panel">
                  <input
                    className="input"
                    placeholder="Search users by username"
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                  />
                  <select
                    className="select"
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(event.target.value as Exclude<WorkspaceRole, "OWNER">)
                    }
                  >
                    {canManageAdmins ? <option value="ADMIN">Admin</option> : null}
                    <option value="CONTRIBUTOR">Contributor</option>
                    <option value="READONLY">Readonly</option>
                  </select>
                  <button className="button" onClick={() => void searchUsers()} type="button">
                    Search
                  </button>
                </div>
              ) : null}

              {userResults.length ? (
                <div className="member-result-list">
                  {userResults.map((result) => (
                    <button
                      className="member-row"
                      key={result.id}
                      onClick={async () => {
                        await addMember(result.id, memberRole);
                        setUserResults([]);
                        setMemberQuery("");
                      }}
                      type="button"
                    >
                      <span className="user-chip__avatar">
                        {result.username.slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{result.username}</strong>
                      <span className="badge">Add as {memberRole}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="member-filter-row">
                <span>Members</span>
                <select
                  className="select select--compact"
                  value={memberFilter}
                  onChange={(event) => setMemberFilter(event.target.value as MemberFilter)}
                >
                  <option value="ALL">All roles</option>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admins</option>
                  <option value="CONTRIBUTOR">Contributors</option>
                  <option value="READONLY">Readonly</option>
                </select>
              </div>

              <div className="member-list">
                {visibleMembers.map((member) => (
                  <div className="member-row" key={member.id}>
                    <span className="user-chip__avatar">
                      {member.user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="member-row__identity">
                      <strong>{member.user.username}</strong>
                      <small>{member.role}</small>
                    </div>
                    {member.role !== "OWNER" && canManageMembers ? (
                      <div className="member-row__actions">
                        <select
                          className="select select--compact"
                          value={member.role}
                          disabled={member.role === "ADMIN" && !canManageAdmins}
                          onChange={(event) =>
                            void updateMember(
                              member.userId,
                              event.target.value as Exclude<WorkspaceRole, "OWNER">,
                            )
                          }
                        >
                          {canManageAdmins ? <option value="ADMIN">Admin</option> : null}
                          <option value="CONTRIBUTOR">Contributor</option>
                          <option value="READONLY">Readonly</option>
                        </select>
                        <button
                          className="button button-subtle button--small"
                          disabled={member.role === "ADMIN" && !canManageAdmins}
                          onClick={() => void removeMember(member.userId)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
