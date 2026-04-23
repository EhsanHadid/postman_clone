import type { ReactNode } from "react";

interface DrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ title, open, onClose, children }: DrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer card" onClick={(event) => event.stopPropagation()}>
        <header className="drawer__header">
          <h3>{title}</h3>
          <button className="button button-subtle" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="drawer__content">{children}</div>
      </aside>
    </div>
  );
}
