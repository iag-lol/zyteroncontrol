import { Controller, Get, Module } from "@nestjs/common";
import { Public } from "./roles.decorator.js";
import { AuthorizationService } from "./authorization.service.js";
@Controller("auth") class AuthController { @Public() @Get("status") status() { return { provider: "Supabase Auth", configured: Boolean(process.env.SUPABASE_URL) }; } }
@Module({ controllers: [AuthController],providers:[AuthorizationService],exports:[AuthorizationService] }) export class AuthModule {}
