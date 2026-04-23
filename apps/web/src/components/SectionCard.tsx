import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, actions, children }: SectionCardProps) {
  return (
    <section className="section-card card">
      <header className="section-card__header">
        <h3>{title}</h3>
        {actions ? <div className="section-card__actions">{actions}</div> : null}
      </header>
      <div className="section-card__content">{children}</div>
    </section>
  );
}
