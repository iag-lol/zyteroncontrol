import { describe, expect, it } from "vitest";
import { operationsCreateInitialValue } from "./operations-form";

describe("operationsCreateInitialValue", () => {
  it("inicia una OT en DRAFT y conserva el cliente contextual", () => {
    expect(operationsCreateInitialValue("work-order", "client-1")).toEqual({
      clientId: "client-1",
      priority: "NORMAL",
      status: "DRAFT",
    });
  });

  it("reserva BACKLOG exclusivamente para tareas", () => {
    expect(operationsCreateInitialValue("task")).toMatchObject({ status: "BACKLOG" });
    expect(operationsCreateInitialValue("work-order")).not.toMatchObject({ status: "BACKLOG" });
  });

  it("sincroniza los valores visibles de worklogs, entregables y deployments", () => {
    expect(operationsCreateInitialValue("worklog", null, "2026-10-05")).toEqual({ workDate: "2026-10-05", workType: "DEVELOPMENT" });
    expect(operationsCreateInitialValue("deliverable")).toEqual({ type: "DOCUMENT" });
    expect(operationsCreateInitialValue("deployment")).toEqual({ environment: "DEVELOPMENT", status: "PLANNED" });
  });
});
