import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { roles, type Role } from "@zyteron/contracts";
import { createServerSupabase } from "../domain/server-supabase.js";
import { AuthorizationService } from "./authorization.service.js";
import { PUBLIC_ROUTE, REQUIRED_AAL, REQUIRED_PERMISSIONS, REQUIRED_ROLES } from "./roles.decorator.js";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector,private readonly authorization:AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      ip?:string;
    }>();
    let role: string | undefined;
    let userId:string|undefined,aal:"aal1"|"aal2",sessionId:string|null;
    const development=process.env.AUTH_MODE==="development"&&process.env.NODE_ENV!=="production";
    if (development) {
      const rawRole = request.headers["x-zyteron-role"];
      role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
      const rawUser=request.headers["x-zyteron-user-id"],rawAal=request.headers["x-zyteron-aal"],rawSession=request.headers["x-zyteron-session-id"];
      userId=(Array.isArray(rawUser)?rawUser[0]:rawUser)??"00000000-0000-4000-8000-000000000001";
      aal=(Array.isArray(rawAal)?rawAal[0]:rawAal)==="aal2"?"aal2":"aal1";
      sessionId=(Array.isArray(rawSession)?rawSession[0]:rawSession)??null;
    } else {
      const authorization = request.headers.authorization;
      const rawAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;
      const token = rawAuthorization?.startsWith("Bearer ") ? rawAuthorization.slice(7) : undefined;
      const supabase = createServerSupabase();
      if (!token || !supabase) throw new UnauthorizedException("Sesión Supabase ausente o inválida.");
      // getClaims validates the JWT signature locally when Supabase uses an
      // asymmetric signing key and reuses the cached JWKS. This avoids an Auth
      // network request on every protected API call.
      const { data, error } = await supabase.auth.getClaims(token);
      const claims = data?.claims as Record<string, unknown> | undefined;
      if (error || !claims || typeof claims.sub !== "string") {
        throw new UnauthorizedException("Sesión Supabase ausente o inválida.");
      }
      const appMetadata = claims.app_metadata && typeof claims.app_metadata === "object"
        ? claims.app_metadata as Record<string, unknown>
        : {};
      const rawRole = appMetadata.role;
      role = typeof rawRole === "string" ? rawRole : undefined;
      userId=claims.sub;
      aal=claims.aal==="aal2"?"aal2":"aal1";
      sessionId=typeof claims.session_id==="string"?claims.session_id:null;
      request.headers["x-zyteron-user-id"] = userId;
      if (role) request.headers["x-zyteron-role"] = role;
      request.headers["x-zyteron-aal"]=aal;
      if(sessionId)request.headers["x-zyteron-session-id"]=sessionId;
      const clientId = appMetadata.client_id;
      const contactId = appMetadata.contact_id;
      if (typeof clientId === "string") request.headers["x-zyteron-client-id"] = clientId;
      if (typeof contactId === "string") request.headers["x-zyteron-contact-id"] = contactId;
    }

    if (!role || !roles.includes(role as Role)) {
      throw new UnauthorizedException("La identidad no posee un rol interno válido.");
    }
    if (!development && !sessionId) {
      throw new UnauthorizedException("La sesión verificada no contiene un identificador revocable.");
    }

    const required = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if(!required?.includes(role as Role))throw new ForbiddenException("El rol no autoriza esta operación.");
    const requiredPermissions=this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS,[context.getHandler(),context.getClass()])??[];
    if(!(await this.authorization.hasPermissions(role,requiredPermissions)))throw new ForbiddenException("Falta un permiso explícito para esta operación.");
    const requiredAal=this.reflector.getAllAndOverride<string>(REQUIRED_AAL,[context.getHandler(),context.getClass()]);
    if(requiredAal==="aal2"&&aal!=="aal2")throw new ForbiddenException("Esta operación requiere verificación MFA (AAL2).");
    const rawDevice=request.headers["x-zyteron-device-id"],rawAgent=request.headers["user-agent"],forwarded=request.headers["x-forwarded-for"];
    const allowed=await this.authorization.observe({userId:userId!,role,aal,sessionId,deviceId:(Array.isArray(rawDevice)?rawDevice[0]:rawDevice)??null,userAgent:(Array.isArray(rawAgent)?rawAgent[0]:rawAgent)??null,ip:(Array.isArray(forwarded)?forwarded[0]:forwarded)?.split(",")[0]?.trim()??request.ip??null});
    if(!allowed)throw new UnauthorizedException("La sesión o el dispositivo fue revocado, bloqueado o no pudo validarse de forma segura.");
    return true;
  }
}
