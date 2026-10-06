import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceRepository } from "./finance.repository.js";

const storage=vi.hoisted(()=>({upload:vi.fn(),download:vi.fn()}));
vi.mock("../domain/server-supabase.js",()=>({createServerSupabase:()=>({storage:{from:()=>storage}})}));

describe("comprobantes de pagos en Supabase Storage",()=>{
  const bytes=Buffer.from("comprobante de prueba");
  const duplicate={code:"KeyAlreadyExists",status:400,statusCode:"409",message:"The resource already exists"};
  beforeEach(()=>{
    vi.resetAllMocks();
    storage.upload.mockResolvedValue({error:null});
    storage.download.mockResolvedValue({data:new Blob([bytes]),error:null});
  });
  const save=(repo:FinanceRepository,reuseIdentical=true)=>repo.saveFile("finance-documents","payments/evidence/hash-recibo.jpeg",bytes,"image/jpeg",{reuseIdentical});

  it("sube un comprobante nuevo sin sobrescribir",async()=>{
    expect(await save(new FinanceRepository())).toBe("payments/evidence/hash-recibo.jpeg");
    expect(storage.upload).toHaveBeenCalledWith("payments/evidence/hash-recibo.jpeg",bytes,{contentType:"image/jpeg",upsert:false});
    expect(storage.download).not.toHaveBeenCalled();
  });
  it.each([duplicate,{statusCode:"409"}])("reutiliza el mismo contenido ante una colisión de Storage %j",async(error)=>{
    storage.upload.mockResolvedValue({error});
    expect(await save(new FinanceRepository())).toBe("payments/evidence/hash-recibo.jpeg");
    expect(storage.download).toHaveBeenCalledWith("payments/evidence/hash-recibo.jpeg");
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });
  it("rechaza un archivo diferente sin sobrescribirlo",async()=>{
    storage.upload.mockResolvedValue({error:duplicate});
    storage.download.mockResolvedValue({data:new Blob(["otro comprobante"]),error:null});
    await expect(save(new FinanceRepository())).rejects.toBeInstanceOf(ConflictException);
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });
  it("no acepta una colisión si el archivo existente no pudo verificarse",async()=>{
    storage.upload.mockResolvedValue({error:duplicate});
    storage.download.mockResolvedValue({data:null,error:{message:"Unavailable"}});
    await expect(save(new FinanceRepository())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("mantiene el rechazo de duplicados para las otras subidas",async()=>{
    storage.upload.mockResolvedValue({error:duplicate});
    await expect(save(new FinanceRepository(),false)).rejects.toBe(duplicate);
    expect(storage.download).not.toHaveBeenCalled();
  });
  it("no confunde otros errores con archivos existentes",async()=>{
    const denied={status:403,statusCode:"403",code:"AccessDenied"};
    storage.upload.mockResolvedValue({error:denied});
    await expect(save(new FinanceRepository())).rejects.toBe(denied);
    expect(storage.download).not.toHaveBeenCalled();
  });
});
