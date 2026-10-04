import { Body,Controller,Get,Headers,Param,Patch,Post } from "@nestjs/common";
import { RequireAal2,RequirePermissions,RequireRoles } from "../auth/roles.decorator.js";
import { SecurityService,type SecurityActor } from "./security.service.js";

type HeaderMap=Record<string,string|string[]|undefined>;
const header=(headers:HeaderMap,key:string)=>{const value=headers[key];return Array.isArray(value)?value[0]:value;};
const actor=(headers:HeaderMap):SecurityActor=>({userId:header(headers,"x-zyteron-user-id")??null,role:header(headers,"x-zyteron-role")??"",aal:header(headers,"x-zyteron-aal")==="aal2"?"aal2":"aal1",sessionId:header(headers,"x-zyteron-session-id")??null,requestId:header(headers,"x-request-id")??null});
const adminRoles=["GERENTE_GENERAL","SECURITY_ADMIN"]as const;

@Controller("security")
@RequireRoles(...adminRoles)
export class SecurityController{
  constructor(private readonly security:SecurityService){}
  @Get()@RequirePermissions("security.dashboard.view")workspace(@Headers()headers:HeaderMap){return this.security.workspace(actor(headers));}
  @Get("workspace")@RequirePermissions("security.dashboard.view")workspaceAlias(@Headers()headers:HeaderMap){return this.security.workspace(actor(headers));}
  @Get("posture")@RequirePermissions("security.dashboard.view")async posture(@Headers()headers:HeaderMap){return(await this.security.workspace(actor(headers))).posture;}
  @Get("summary")@RequirePermissions("security.dashboard.view")async summary(@Headers()headers:HeaderMap){return(await this.security.workspace(actor(headers))).summary;}
  @Get("users")@RequirePermissions("identity.view")users(){return this.security.identities();}
  @Get("identities")@RequirePermissions("identity.view")identities(){return this.security.identities();}
  @Get("mfa")@RequirePermissions("mfa.view")async mfa(){const identities=await this.security.identities();return{identities,coverage:null,note:"La cobertura se calcula únicamente cuando Supabase entrega evidencia de factores verificados."};}
  @Patch("users/:id/role")@RequirePermissions("identity.role.manage")@RequireAal2()role(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.changeUserRole(id,body,actor(headers));}
  @Get("roles")@RequirePermissions("role.view")async roles(@Headers()headers:HeaderMap){return(await this.security.workspace(actor(headers))).roles;}
  @Get("permissions")@RequirePermissions("permission.view")async permissions(@Headers()headers:HeaderMap){return(await this.security.workspace(actor(headers))).permissions;}

  @Get("sessions")@RequirePermissions("session.view")sessions(@Headers()headers:HeaderMap){return this.security.sessions(actor(headers));}
  @Post("sessions/:id/revoke")@RequirePermissions("session.revoke")@RequireAal2()revokeSession(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.revokeSession(id,actor(headers),body.reason);}
  @Post("users/:id/revoke-sessions")@RequirePermissions("session.revoke")@RequireAal2()revokeUserSessions(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.revokeUserSessions(id,actor(headers),body.reason);}
  @Post("users/:id/lock")@RequirePermissions("identity.lock")@RequireAal2()lockUser(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.lockUser(id,actor(headers),body.reason);}

  @Get("devices")@RequirePermissions("device.view")devices(@Headers()headers:HeaderMap){return this.security.devices(actor(headers));}
  @Post("devices/:id/trust")@RequirePermissions("device.manage")@RequireAal2()trust(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.deviceAction(id,"TRUSTED",actor(headers),body.reason);}
  @Post("devices/:id/block")@RequirePermissions("device.manage")@RequireAal2()block(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.deviceAction(id,"BLOCKED",actor(headers),body.reason);}
  @Post("devices/:id/revoke")@RequirePermissions("device.manage")@RequireAal2()revokeDevice(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.deviceAction(id,"REVOKED",actor(headers),body.reason);}

  @Get("access-requests")@RequirePermissions("jit.view")listAccess(@Headers()headers:HeaderMap){return this.security.records("access_requests",actor(headers));}
  @Post("access-requests")@RequirePermissions("jit.request")requestAccess(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createAccessRequest(body,actor(headers));}
  @Post("access-requests/:id/approve")@RequirePermissions("jit.approve")@RequireAal2()approveAccess(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.decideAccess(id,true,body,actor(headers));}
  @Post("access-requests/:id/reject")@RequirePermissions("jit.approve")@RequireAal2()rejectAccess(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.decideAccess(id,false,body,actor(headers));}
  @Post("access-grants/:id/revoke")@RequirePermissions("jit.revoke")@RequireAal2()revokeGrant(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.revokeGrant(id,actor(headers),body.reason);}

  @Get("vault")@RequirePermissions("vault.metadata.view")vault(@Headers()headers:HeaderMap){return this.security.records("vault_items",actor(headers));}
  @Post("vault")@RequirePermissions("vault.manage")@RequireAal2()createVault(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createVaultItem(body,actor(headers));}
  @Get("vault/:id")@RequirePermissions("vault.metadata.view")vaultItem(@Param("id")id:string,@Headers()headers:HeaderMap){return this.security.vaultItem(id,actor(headers));}
  @Post("vault/:id/request-access")@RequirePermissions("jit.request")requestVault(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.requestVaultAccess(id,body,actor(headers));}
  @Post("vault/:id/reveal")@RequirePermissions("vault.reveal")@RequireAal2()revealVault(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.revealVaultItem(id,body,actor(headers));}
  @Post("vault/:id/rotate-metadata")@RequirePermissions("vault.rotate")@RequireAal2()rotateVault(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.rotateVaultMetadata(id,body,actor(headers));}
  @Post("vault/:id/revoke-access")@RequirePermissions("jit.revoke")@RequireAal2()revokeVaultAccess(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.revokeGrant(String(body.grantId??id),actor(headers),body.reason);}

  @Get("events")@RequirePermissions("security.event.view")events(@Headers()headers:HeaderMap){return this.security.records("security_events",actor(headers));}
  @Get("events/:id")@RequirePermissions("security.event.view")event(@Param("id")id:string,@Headers()headers:HeaderMap){return this.security.record("security_events",id,actor(headers));}
  @Post("events/:id/acknowledge")@RequirePermissions("security.event.triage")acknowledge(@Param("id")id:string,@Headers()headers:HeaderMap){return this.security.acknowledgeEvent(id,actor(headers));}
  @Post("events/:id/escalate")@RequirePermissions("incident.create")escalate(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.escalateEvent(id,body,actor(headers));}

  @Get("incidents")@RequirePermissions("incident.view")incidents(@Headers()headers:HeaderMap){return this.security.records("security_incidents",actor(headers));}
  @Post("incidents")@RequirePermissions("incident.create")createIncident(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createIncident(body,actor(headers));}
  @Get("incidents/:id")@RequirePermissions("incident.view")incident(@Param("id")id:string,@Headers()headers:HeaderMap){return this.security.record("security_incidents",id,actor(headers));}
  @Post("incidents/:id/change-status")@RequirePermissions("incident.manage")incidentStatus(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.incidentStatus(id,body,actor(headers));}
  @Post("incidents/:id/add-action")@RequirePermissions("incident.manage")incidentAction(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.addIncidentAction(id,body,actor(headers));}
  @Post("incidents/:id/close")@RequirePermissions("incident.close")@RequireAal2()closeIncident(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.incidentStatus(id,{...body,status:"CLOSED"},actor(headers));}

  @Get("vulnerabilities")@RequirePermissions("vulnerability.view")vulnerabilities(@Headers()headers:HeaderMap){return this.security.records("security_vulnerabilities",actor(headers));}
  @Post("vulnerabilities")@RequirePermissions("vulnerability.manage")createVulnerability(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createVulnerability(body,actor(headers));}
  @Patch("vulnerabilities/:id")@RequirePermissions("vulnerability.manage")updateVulnerability(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.updateVulnerability(id,body,actor(headers));}
  @Post("vulnerabilities/:id/verify-fix")@RequirePermissions("vulnerability.verify")updateFix(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.updateVulnerability(id,{...body,status:"VERIFIED"},actor(headers));}

  @Get("rls")@RequirePermissions("rls.audit.view")async rls(@Headers()headers:HeaderMap){return(await this.security.records<any>("security_controls",actor(headers))).filter(item=>String(item.controlCode).startsWith("RLS-"));}
  @Get("privacy/data-assets")@RequirePermissions("privacy.view")dataAssets(@Headers()headers:HeaderMap){return this.security.records("data_assets",actor(headers));}
  @Post("privacy/data-assets")@RequirePermissions("privacy.manage")createDataAsset(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("data_assets",body,actor(headers));}
  @Get("privacy/processing-activities")@RequirePermissions("privacy.view")processing(@Headers()headers:HeaderMap){return this.security.records("processing_activities",actor(headers));}
  @Post("privacy/processing-activities")@RequirePermissions("privacy.manage")createProcessing(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("processing_activities",body,actor(headers));}
  @Get("privacy/subject-requests")@RequirePermissions("privacy.subject_request.view")subjectRequests(@Headers()headers:HeaderMap){return this.security.records("data_subject_requests",actor(headers));}
  @Post("privacy/subject-requests")@RequirePermissions("privacy.subject_request.manage")createSubjectRequest(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("data_subject_requests",body,actor(headers));}
  @Post("privacy/dpia")@RequirePermissions("privacy.dpia.manage")createDpia(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("privacy_impact_assessments",body,actor(headers));}
  @Get("privacy/dpia")@RequirePermissions("privacy.view")dpias(@Headers()headers:HeaderMap){return this.security.records("privacy_impact_assessments",actor(headers));}
  @Get("privacy/retention")@RequirePermissions("privacy.view")retention(@Headers()headers:HeaderMap){return this.security.records("retention_policies",actor(headers));}
  @Post("privacy/retention")@RequirePermissions("privacy.manage")createRetention(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("retention_policies",body,actor(headers));}
  @Get("dlp")@RequirePermissions("dlp.view")dlp(@Headers()headers:HeaderMap){return this.security.records("data_export_events",actor(headers));}
  @Get("vendors")@RequirePermissions("vendor_security.view")vendors(@Headers()headers:HeaderMap){return this.security.records("vendor_security_registry",actor(headers));}
  @Post("vendors")@RequirePermissions("vendor_security.manage")createVendor(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("vendor_security_registry",body,actor(headers));}
  @Get("backups")@RequirePermissions("backup.view")backups(@Headers()headers:HeaderMap){return this.security.records("backup_targets",actor(headers));}
  @Get("recovery-tests")@RequirePermissions("backup.view")recoveryTests(@Headers()headers:HeaderMap){return this.security.records("recovery_tests",actor(headers));}
  @Post("recovery-tests")@RequirePermissions("backup.test.manage")createRecovery(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("recovery_tests",body,actor(headers));}
  @Get("disaster-recovery")@RequirePermissions("backup.view")dr(@Headers()headers:HeaderMap){return this.security.records("disaster_recovery_plans",actor(headers));}
  @Get("testing")@RequirePermissions("security.testing.view")testing(@Headers()headers:HeaderMap){return this.security.records("security_scans",actor(headers));}
  @Post("testing")@RequirePermissions("security.testing.manage")createScan(@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("security_scans",body,actor(headers));}
  @Get("cicd")@RequirePermissions("security.testing.view")cicd(@Headers()headers:HeaderMap){return this.security.records("security_scans",actor(headers));}
  @Get("controls")@RequirePermissions("compliance.view")controls(@Headers()headers:HeaderMap){return this.security.records("security_controls",actor(headers));}
  @Patch("controls/:id")@RequirePermissions("compliance.manage")control(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.updateControl(id,body,actor(headers));}
  @Post("controls/:id/evidence")@RequirePermissions("compliance.manage")controlEvidence(@Param("id")id:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.createRecord("security_control_evidence",{...body,controlId:id},actor(headers));}
  @Get("compliance")@RequirePermissions("compliance.view")compliance(@Headers()headers:HeaderMap){return this.security.records("security_controls",actor(headers));}
  @Post("gate/evaluate")@RequirePermissions("security.gate.evaluate")@RequireAal2()gate(@Body()body:any,@Headers()headers:HeaderMap){return this.security.evaluateGate(body,actor(headers));}
  @Get("gate")@RequirePermissions("security.gate.view")gateHistory(@Headers()headers:HeaderMap){return this.security.records("production_security_gates",actor(headers));}
  @Get("configuration")@RequirePermissions("security.config.view")configuration(@Headers()headers:HeaderMap){return this.security.records("security_settings",actor(headers));}
  @Patch("configuration/:key")@RequirePermissions("security.config.manage")@RequireAal2()updateConfiguration(@Param("key")key:string,@Body()body:any,@Headers()headers:HeaderMap){return this.security.updateSetting(key,body,actor(headers));}
  @Get("reports")@RequirePermissions("security.report.view")async reports(@Headers()headers:HeaderMap){const workspace=await this.security.workspace(actor(headers));return{summary:workspace.summary,posture:workspace.posture,generatedAt:workspace.generatedAt};}
}
