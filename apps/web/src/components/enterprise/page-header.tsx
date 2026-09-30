import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="pageHeader"><div>{eyebrow ? <span className="phasePill">{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions}</header>;
}

