import { SetMetadata } from "@nestjs/common";
import type { Role } from "@zyteron/contracts";

export const PUBLIC_ROUTE = "zyteron:public";
export const REQUIRED_ROLES = "zyteron:roles";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(REQUIRED_ROLES, roles);

