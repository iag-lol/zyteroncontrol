import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { ContractStatus } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import type { ContractInput } from "./contracts.dto.js";
import { ContractsService } from "./contracts.service.js";

const readers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL", "JEFE_DESARROLLO", "FINANZAS"] as const;
const managers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"] as const;

@Controller("contracts")
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @RequireRoles(...readers)
  list(@Query() query: Record<string, string | undefined>) { return this.service.list(query); }

  @Get("types/catalog")
  @RequireRoles(...readers)
  types() { return this.service.types(); }

  @Post()
  @RequireRoles(...managers)
  create(@Body() body: ContractInput) { return this.service.create(body); }

  @Get(":id")
  @RequireRoles(...readers)
  get(@Param("id") id: string) { return this.service.get(id); }

  @Patch(":id")
  @RequireRoles(...managers)
  update(@Param("id") id: string, @Body() body: Partial<ContractInput>) { return this.service.update(id, body); }

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
  signature() { return this.service.requestSignature(); }

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
