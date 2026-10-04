import type { ReactNode } from "react";
import { ProjectFinancePanel } from "@/components/finance/entity-finance-panels";
import "../../finance.css";
/** Project 360 · pestaña financiera montada vía layout (no altera el workspace de Operaciones). Sólo roles con acceso financiero la ven. */
export default async function ProjectsLayout({ children, params }: { children: ReactNode; params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  return <>{children}{segments[0] ? <div className="fx-project-slot"><ProjectFinancePanel projectId={segments[0]} /></div> : null}</>;
}
