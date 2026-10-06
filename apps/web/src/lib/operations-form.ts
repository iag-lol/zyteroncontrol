import { todayInChile } from "./date-time";

export type OperationsCreateKind = "work-order" | "task" | "milestone" | "worklog" | "deliverable" | "deployment";

export function operationsCreateInitialValue(kind: OperationsCreateKind, initialClientId: string | null = null, today = todayInChile()): Record<string, unknown> {
  switch (kind) {
    case "work-order":
      return { priority: "NORMAL", status: "DRAFT", ...(initialClientId ? { clientId: initialClientId } : {}) };
    case "task":
      return { priority: "NORMAL", status: "BACKLOG" };
    case "worklog":
      return { workDate: today, workType: "DEVELOPMENT" };
    case "deliverable":
      return { type: "DOCUMENT" };
    case "deployment":
      return { environment: "DEVELOPMENT", status: "PLANNED" };
    default:
      return {};
  }
}
