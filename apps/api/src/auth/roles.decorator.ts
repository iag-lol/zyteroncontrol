import { SetMetadata } from "@nestjs/common";
import type { Role } from "@zyteron/contracts";

export const PUBLIC_ROUTE = "zyteron:public";
export const REQUIRED_ROLES = "zyteron:roles";
export const REQUIRED_PERMISSIONS = "zyteron:permissions";
export const REQUIRED_AAL = "zyteron:aal";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
export const RequireAal2 = () => SetMetadata(REQUIRED_AAL, "aal2");
