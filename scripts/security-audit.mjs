/* global console */
import { execFileSync } from "node:child_process";
import { existsSync,mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const root=resolve(import.meta.dirname,"..");
const tracked=[...new Set(execFileSync("git",["ls-files","--cached","--others","--exclude-standard"],{cwd:root,encoding:"utf8"}).trim().split("\n").filter(file=>file&&existsSync(resolve(root,file))))].sort();
const production=tracked.filter(file=>/^(apps|packages|supabase)\//.test(file)&&!/(\.test\.|\/dist\/|graphify-out)/.test(file));
const read=file=>readFileSync(resolve(root,file),"utf8");
const findings=[];
const add=(id,severity,title,module,evidence,recommendation,status="OPEN")=>findings.push({id,severity,title,module,evidence,recommendation,status});

for(const file of tracked.filter(file=>/(^|\/)(\.env|\.env\.local|.*\.(pem|key|p12|pfx))$/.test(file)&&file!==".env.example"))add("SEC-SECRET-FILE","CRITICAL","Archivo sensible versionado","Repository",file,"Retirar del historial, revocar y rotar el material.");
for(const file of production){const content=read(file);if(/NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|PRIVATE_KEY)/.test(content))add("SEC-PUBLIC-SECRET","CRITICAL","Referencia de secreto en bundle público",file,"Nombre de variable sensible detectado; valor deliberadamente omitido.","Mover el secreto al backend y rotarlo si estuvo expuesto.");if(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)||/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content))add("SEC-COMMITTED-CREDENTIAL","CRITICAL","Credencial con formato reconocible",file,"Patrón detectado; el valor no se imprime.","Revocar, rotar y limpiar historial.");if(/dangerouslySetInnerHTML/.test(content))add("SEC-XSS-SINK","HIGH","Uso de render HTML directo",file,"dangerouslySetInnerHTML detectado.","Eliminar o aplicar sanitizador mantenido con política CSP.");if(/app_metadata\.role\s*\?\?\s*.*user_metadata\.role/.test(content))add("SEC-ROLE-SELF-ESCALATION","CRITICAL","Fallback de rol a user_metadata",file,"El rol podría ser controlado por el usuario.","Autorizar solo desde app_metadata administrado por backend.");if(/origin\s*:\s*["']\*["']/.test(content))add("SEC-CORS-WILDCARD","CRITICAL","CORS wildcard en API autenticada",file,"origin: * detectado.","Usar allowlist explícita por entorno.");}
const main=read("apps/api/src/main.ts"),guard=read("apps/api/src/auth/role.guard.ts"),migration=read("supabase/migrations/20261004010000_security_control_plane.sql"),next=read("apps/web/next.config.ts");
if(!main.includes('AUTH_MODE==="development"')||!main.includes('NODE_ENV==="production"'))add("SEC-DEV-AUTH-PROD","CRITICAL","Modo de desarrollo no bloqueado en producción","API","No se encontró el guard esperado.","Abortar arranque productivo con AUTH_MODE=development.");
if(!guard.includes("data.user.app_metadata.role"))add("SEC-ROLE-SOURCE","CRITICAL","Fuente de rol no verificable","Auth","No se encontró app_metadata.role.","Obtener roles solo desde metadata administrativa.");
if(!migration.includes("enable row level security")||!migration.includes("security_admin_scope"))add("SEC-RLS-MISSING","CRITICAL","RLS de Security incompleta","Supabase","No se encontraron habilitación y políticas esperadas.","Habilitar RLS y políticas explícitas deny-by-default.");
if(!next.includes("Content-Security-Policy")||!main.includes("content-security-policy"))add("SEC-HEADERS","HIGH","Headers de seguridad incompletos","Web/API","No se encontró CSP en ambas superficies.","Configurar CSP, HSTS, nosniff, referrer y frame protections.");
if(!production.some(file=>file.includes("rate-limit")))add("SEC-RATE-LIMIT","HIGH","Rate limiting aplicativo no implementado","Platform","No existe un componente mantenido de rate limiting en el repositorio.","Configurar rate limiting en edge/API para auth, Vault, exports y webhooks.");
if(!process.env.SECURITY_SECRET_SCAN_PROVIDER)add("SEC-SECRET-SCANNER","HIGH","Scanner externo de secretos no configurado","CI/CD","SECURITY_SECRET_SCAN_PROVIDER ausente; esta auditoría solo aplica heurísticas locales.","Integrar Gitleaks, TruffleHog u otra herramienta mantenida.");
if(!process.env.SECURITY_SAST_PROVIDER)add("SEC-SAST","HIGH","SAST no configurado","CI/CD","SECURITY_SAST_PROVIDER ausente.","Integrar un analizador compatible y registrar resultados en security_scans.");
if(!process.env.SECURITY_BACKUP_PROVIDER)add("SEC-BACKUP-PROVIDER","HIGH","Evidencia de backup no conectada","Recovery","SECURITY_BACKUP_PROVIDER ausente.","Conectar evidencia real y ejecutar una restauración controlada.");

const order={CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1,INFO:0};findings.sort((a,b)=>order[b.severity]-order[a.severity]||a.id.localeCompare(b.id));
const summary={critical:findings.filter(item=>item.severity==="CRITICAL"&&item.status==="OPEN").length,high:findings.filter(item=>item.severity==="HIGH"&&item.status==="OPEN").length,medium:findings.filter(item=>item.severity==="MEDIUM"&&item.status==="OPEN").length,low:findings.filter(item=>item.severity==="LOW"&&item.status==="OPEN").length};
const report={schemaVersion:1,generatedAt:new Date().toISOString(),scope:"tracked repository files; no secret values emitted",summary,findings};
const out=resolve(root,"security-artifacts");mkdirSync(out,{recursive:true});writeFileSync(resolve(out,"security-report.json"),JSON.stringify(report,null,2));
const markdown=["# Zyteron Security Audit","",`Generated: ${report.generatedAt}`,"",`Open: ${summary.critical} critical · ${summary.high} high · ${summary.medium} medium · ${summary.low} low`,"",...findings.flatMap(item=>[`## ${item.severity} — ${item.id}: ${item.title}`,"",`- Module: ${item.module}`,`- Evidence: ${item.evidence}`,`- Recommendation: ${item.recommendation}`,`- Status: ${item.status}`,""])].join("\n");writeFileSync(resolve(out,"security-report.md"),markdown);
console.log(`Security audit: ${summary.critical} critical · ${summary.high} high · ${summary.medium} medium · ${summary.low} low`);console.log(`Reports: ${resolve(out,"security-report.json")} and ${resolve(out,"security-report.md")}`);
if(summary.critical>0)process.exitCode=1;
