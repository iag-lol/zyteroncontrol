import { describe, expect, it } from "vitest";
import { DomainInsightsService } from "./domain-insights.service.js";

describe("DomainInsightsService",()=>{
  it("degrada por dominio sin derribar el resumen ejecutivo",async()=>{
    const service=new DomainInsightsService();
    Object.defineProperty(service,"db",{value:undefined});
    const result=await service.executive();
    expect(result.status).toBe("DEGRADED");
    expect(result.sources).toHaveLength(9);
    expect(result.metrics.activeClients).toBe(0);
  });

  it("no expone cifras financieras del cliente sin permiso explícito",async()=>{
    const service=new DomainInsightsService();
    Object.defineProperty(service,"db",{value:undefined});
    const result=await service.client("11111111-1111-4111-8111-111111111111",false);
    expect(result.finance).toBeNull();
    expect(result.sources.find(source=>source.domain==="FINANZAS")?.status).toBe("UNAVAILABLE");
  });

  it("mantiene pagos de cartera ocultos cuando el rol no tiene permiso financiero",async()=>{
    const service=new DomainInsightsService();
    Object.defineProperty(service,"db",{value:undefined});
    const result=await service.portfolio([],false);
    expect(result.summary.pendingPayments).toBeNull();
    expect(result.byClient).toEqual({});
  });
});
