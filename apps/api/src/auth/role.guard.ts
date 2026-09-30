import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { roles, type Role } from "@zyteron/contracts";
import { PUBLIC_ROUTE, REQUIRED_ROLES } from "./roles.decorator.js";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    if (process.env.AUTH_MODE !== "development") {
      throw new UnauthorizedException(
        "Supabase Auth aún no está configurado. Acceso denegado.",
      );
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const rawRole = request.headers["x-zyteron-role"];
    const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

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
