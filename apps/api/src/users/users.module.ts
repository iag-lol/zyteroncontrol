import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { roles, type Role, type UserDirectoryItem } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { createServerSupabase } from "../domain/server-supabase.js";

@Injectable()
class UsersDirectoryService {
  private readonly supabase = createServerSupabase();

  async list(): Promise<UserDirectoryItem[]> {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase.auth.admin.listUsers({ page:1, perPage:1000 });
    if (error) throw error;
    return data.users.map((user) => {
      const rawRole = user.app_metadata.role ?? user.user_metadata.role;
      return {
        id:user.id,
        email:user.email ?? "",
        name:String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Usuario"),
        role:roles.includes(rawRole as Role) ? rawRole as Role : null,
        active:!user.banned_until || new Date(user.banned_until) <= new Date(),
      };
    }).filter((user) => user.active).sort((a, b) => a.name.localeCompare(b.name, "es-CL"));
  }
}

@Controller("users")
class UsersController {
  constructor(private readonly directory: UsersDirectoryService) {}

  @Get("directory")
  @RequireRoles("GERENTE_GENERAL", "JEFE_VENTAS", "EJECUTIVA_VENTAS", "COMERCIAL", "JEFE_DESARROLLO")
  listDirectory() { return this.directory.list(); }
}

@Module({ controllers:[UsersController], providers:[UsersDirectoryService] })
export class UsersModule {}
