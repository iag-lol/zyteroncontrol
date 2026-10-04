import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import type { ContractStatus } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import type { ContractInput } from "./contracts.dto.js";
import { ContractsService, type ContractActor } from "./contracts.service.js";

const readers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL", "JEFE_DESARROLLO", "FINANZAS"] as const;
const managers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"] as const;
type HeaderMap=Record<string,string|string[]|undefined>;
const header=(headers:HeaderMap,key:string)=>{const value=headers[key];return Array.isArray(value)?value[0]:value;};
const actor=(headers:HeaderMap):ContractActor=>({userId:header(headers,"x-zyteron-user-id")??null,role:header(headers,"x-zyteron-role")??"",clientId:header(headers,"x-zyteron-client-id")??null,contactId:header(headers,"x-zyteron-contact-id")??null});

@Controller("contracts")
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @RequireRoles(...readers)
  list(@Query() query: Record<string, string | undefined>) { return this.service.list(query); }

  @Get("types/catalog")
  @RequireRoles(...readers)
  types() { return this.service.types(); }

  @Get("templates/catalog")
  @RequireRoles(...readers)
  templates() { return this.service.templates(); }

  @Get("templates/catalog/:code")
  @RequireRoles(...readers)
  template(@Param("code") code: string) { return this.service.template(code); }

  @Get("builder/context")
  @RequireRoles(...readers)
  context(@Query("clientId") clientId?: string) { return this.service.context(clientId); }

  @Post()
  @RequireRoles(...managers)
  create(@Body() body: ContractInput) { return this.service.create(body); }

  @Get(":id")
  @RequireRoles(...readers)
  get(@Param("id") id: string) { return this.service.get(id); }

  @Patch(":id")
  @RequireRoles(...managers)
  update(@Param("id") id: string, @Body() body: Partial<ContractInput>) { return this.service.update(id, body); }

  @Patch(":id/builder")
  @RequireRoles(...managers)
  builder(@Param("id") id:string,@Body() body:any){return this.service.saveBuilder(id,body);}

  @Get(":id/validate")
  @RequireRoles(...readers)
  validate(@Param("id") id:string){return this.service.validate(id);}

  @Get(":id/render-preview")
  @RequireRoles(...readers)
  preview(@Param("id") id:string){return this.service.preview(id);}

  @Get(":id/render-pdf")
  @RequireRoles(...readers)
  previewPdf(@Param("id") id:string){return this.service.previewPdf(id);}

  @Post(":id/approve")
  @RequireRoles("GERENTE_GENERAL")
  approve(@Param("id") id:string,@Body() body:{legalReviewConfirmed?:boolean;comment?:string},@Headers() headers:HeaderMap){return this.service.approve(id,body,actor(headers));}

  @Post(":id/archive")
  @RequireRoles(...managers)
  archive(@Param("id") id: string) { return this.service.archive(id); }

  @Post(":id/activate")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  activate(@Param("id") id: string) { return this.service.activate(id); }

  @Post(":id/transition")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  transition(@Param("id") id: string, @Body() body: { status: ContractStatus }) { return this.service.transition(id, body.status); }

  @Post(":id/request-signature")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  signature(@Param("id") id:string,@Body() body:{signers?:Array<{name:string;email:string;order:number}>;callbackUrl?:string|null},@Headers() headers:HeaderMap) { return this.service.requestSignature(id,body,actor(headers)); }

  @Post(":id/authority-reviews")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  authority(@Param("id") id:string,@Body() body:any,@Headers() headers:HeaderMap){return this.service.recordAuthorityReview(id,body,actor(headers));}

  @Post(":id/copy-receipts")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  receipt(@Param("id") id:string,@Body() body:any){return this.service.recordCopyReceipt(id,body);}

  @Post(":id/verify-signature")
  @RequireRoles("GERENTE_GENERAL", "FINANZAS")
  verifySignature(@Param("id") id:string,@Headers() headers:HeaderMap){return this.service.verifySignature(id,actor(headers));}

  @Post(":id/documents/upload-url")
  @RequireRoles(...managers)
  uploadUrl(@Param("id") id: string, @Body() body: { name: string; type: string }) { return this.service.uploadUrl(id, body); }

  @Post(":id/documents/complete")
  @RequireRoles(...managers)
  complete(
    @Param("id") id: string,
    @Body() body: { path: string; title: string; mimeType: string; sizeBytes: number; documentHash?: string; versionKind?: "CONTRACT" | "ANNEX" },
  ) { return this.service.completeUpload(id, body); }

  @Get(":id/documents/:versionId/url")
  @RequireRoles(...readers)
  documentUrl(@Param("id") id: string, @Param("versionId") versionId: string) { return this.service.documentUrl(id, versionId); }
}

@Controller("clients/:clientId/contracts")
export class ClientContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @RequireRoles(...readers)
  list(@Param("clientId") clientId: string, @Query() query: Record<string, string | undefined>) {
    return this.service.list({ ...query, clientId });
  }
}
