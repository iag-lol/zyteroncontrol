import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module.js";
import { securityRateLimit } from "./security/rate-limit.middleware.js";

config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

async function bootstrap() {
  if(process.env.NODE_ENV==="production"){
    if(process.env.AUTH_MODE==="development")throw new Error("AUTH_MODE=development está prohibido en producción.");
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error("Supabase server-side es obligatorio en producción.");
    if(!process.env.WEB_ORIGIN)throw new Error("WEB_ORIGIN es obligatorio en producción y debe contener la allowlist del frontend.");
    for(const name of["RATE_LIMIT_DEFAULT_PER_MINUTE","RATE_LIMIT_AUTH_PER_MINUTE","RATE_LIMIT_VAULT_PER_MINUTE","RATE_LIMIT_EXPORT_PER_MINUTE","RATE_LIMIT_WEBHOOK_PER_MINUTE"])if(!process.env[name])throw new Error(`${name} es obligatorio en producción.`);
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Respaldos (comprobantes, XML/CAF, cartolas, facturas SII) viajan en base64: límite acotado y explícito.
  app.useBodyParser("json", { limit: "25mb" });
  const http=app.getHttpAdapter().getInstance();
  http.disable?.("x-powered-by");
  if(process.env.NODE_ENV==="production")http.set?.("trust proxy",1);
  app.use((request:any,response:any,next:any)=>{
    const suppliedRequestId=request.headers["x-request-id"];
    const requestId=typeof suppliedRequestId==="string"&&/^[A-Za-z0-9._-]{8,128}$/.test(suppliedRequestId)?suppliedRequestId:randomUUID();
    request.headers["x-request-id"]=requestId;
    response.setHeader("x-request-id",requestId);
    response.setHeader("x-content-type-options","nosniff");
    response.setHeader("referrer-policy","no-referrer");
    response.setHeader("permissions-policy","camera=(), microphone=(), geolocation=()");
    response.setHeader("content-security-policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if(process.env.NODE_ENV==="production")response.setHeader("strict-transport-security","max-age=31536000; includeSubDomains");
    next();
  });
  app.use(securityRateLimit);
  app.setGlobalPrefix("api");
  const origins=(process.env.WEB_ORIGIN??"http://localhost:3000").split(",").map(value=>value.trim()).filter(Boolean);
  if(origins.includes("*"))throw new Error("WEB_ORIGIN no puede contener '*' para una API autenticada.");
  app.enableCors({
    origin: origins,
    credentials:true,
    allowedHeaders:["authorization","content-type","idempotency-key","x-request-id","x-zyteron-role","x-zyteron-user-id","x-zyteron-aal","x-zyteron-session-id","x-zyteron-device-id"],
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Zyteron Control API listening on http://localhost:${port}/api`);
}

void bootstrap();
