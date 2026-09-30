"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/components/access-context";
import { canAccessGroup } from "@/lib/access-control";
import { EmptyState } from "./empty-state";

export function PermissionGate({ group, children, fallback = null }: { group: string; children: ReactNode; fallback?: ReactNode }) {
  const { role } = useAccess();
  return canAccessGroup(role, group) ? children : fallback;
}

export function RoleGuard({ group, children }: { group: string; children: ReactNode }) {
  return <PermissionGate group={group} fallback={<div className="guardDenied"><EmptyState title="Acceso restringido" description="Tu rol actual no tiene permiso para acceder a este módulo." /></div>}>{children}</PermissionGate>;
}

