"use client";

import { createContext, useContext } from "react";
import type { Role } from "@zyteron/contracts";

interface AccessContextValue {
  role: Role;
}

export const AccessContext = createContext<AccessContextValue>({ role: "GERENTE_GENERAL" });

export function useAccess() {
  return useContext(AccessContext);
}

