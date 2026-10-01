import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { roles, type Role } from "@zyteron/contracts";
import { createServerSupabase } from "../domain/server-supabase.js";
import { PUBLIC_ROUTE, REQUIRED_ROLES } from "./roles.decorator.js";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    let role: string | undefined;
    if (process.env.AUTH_MODE === "development") {
      const rawRole = request.headers["x-zyteron-role"];
      role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
    } else {
      const authorization = request.headers.authorization;
      const rawAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;
      const token = rawAuthorization?.startsWith("Bearer ") ? rawAuthorization.slice(7) : undefined;
      const supabase = createServerSupabase();
      if (!token || !supabase) throw new UnauthorizedException("Sesión Supabase ausente o inválida.");
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new UnauthorizedException("Sesión Supabase ausente o inválida.");
      const rawRole = data.user.app_metadata.role ?? data.user.user_metadata.role;
      role = typeof rawRole === "string" ? rawRole : undefined;
      request.headers["x-zyteron-user-id"] = data.user.id;
      if (role) request.headers["x-zyteron-role"] = role;
    }

    if (!role || !roles.includes(role as Role)) {
      throw new UnauthorizedException("Rol de desarrollo ausente o inválido.");
    }

    const required = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    return Boolean(required?.includes(role as Role));
  }
}
