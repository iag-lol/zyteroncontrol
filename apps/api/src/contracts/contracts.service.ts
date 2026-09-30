import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ContractStatus } from "@zyteron/contracts";
import { ClientEventsService } from "../clients/client-events.service.js";
import { clientProviderPorts } from "../clients/client-provider-ports.js";
import { pagination } from "../domain/server-supabase.js";
import { validateContract,type ContractInput } from "./contracts.dto.js";
import { ContractsRepository } from "./contracts.repository.js";

const transitions:Record<ContractStatus,ContractStatus[]>={DRAFT:["IN_REVIEW","CANCELLED"],IN_REVIEW:["DRAFT","PENDING_SIGNATURE","SIGNED","ACTIVE","CANCELLED"],PENDING_SIGNATURE:["SIGNED","CANCELLED"],SIGNED:["ACTIVE","CANCELLED"],ACTIVE:["EXPIRING","TERMINATED"],EXPIRING:["ACTIVE","EXPIRED","TERMINATED"],EXPIRED:[],TERMINATED:[],CANCELLED:[]};
@Injectable()
export class ContractsService{
  constructor(private readonly repository:ContractsRepository,private readonly events:ClientEventsService){}
  types(){return this.repository.types();}
  list(query:Record<string,string|undefined>){return this.repository.list({...query,...pagination(query)});}
  async get(id:string){const item=await this.repository.get(id);if(!item)throw new NotFoundException("Contrato no encontrado.");return{...item,versions:await this.repository.versions(id),signatureConfigured:clientProviderPorts.electronicSignature!=="NOT_CONFIGURED"};}
  async create(input:ContractInput){const item=await this.repository.create(validateContract(input));await this.events.publish(item.clientId,"CONTRACT_CREATED","Contrato creado",`${item.contractNumber} · ${item.name}`);return item;}
  async update(id:string,patch:Partial<ContractInput>){const item=await this.repository.update(id,patch);await this.events.publish(item.clientId,"CONTRACT_UPDATED","Contrato actualizado",item.contractNumber);return item;}
  async archive(id:string){const item=await this.repository.archive(id);await this.events.publish(item.clientId,"CONTRACT_CANCELLED","Contrato archivado",item.contractNumber);return item;}
  async transition(id:string,status:ContractStatus){const current=await this.repository.get(id);if(!current)throw new NotFoundException("Contrato no encontrado.");if(!transitions[current.status].includes(status))throw new BadRequestException(`No se puede pasar de ${current.status} a ${status}.`);const item=await this.repository.transition(id,status);await this.events.publish(item.clientId,status==="ACTIVE"?"CONTRACT_ACTIVATED":status==="SIGNED"?"CONTRACT_SIGNED":"CONTRACT_UPDATED",`Contrato ${status.toLowerCase()}`,item.contractNumber);return item;}
  activate(id:string){return this.transition(id,"ACTIVE");}
  requestSignature(){throw new ServiceUnavailableException("Integración de firma electrónica no configurada.");}
  async uploadUrl(id:string,file:{name:string;type:string}){const contract=await this.repository.get(id);if(!contract)throw new NotFoundException("Contrato no encontrado.");return this.repository.createUploadUrl(contract,file);}
  async completeUpload(id:string,input:{path:string;title:string;mimeType:string;sizeBytes:number;documentHash?:string;versionKind?:"CONTRACT"|"ANNEX"}){const contract=await this.repository.get(id);if(!contract)throw new NotFoundException("Contrato no encontrado.");const version=await this.repository.completeUpload(contract,input);await this.events.publish(contract.clientId,"CONTRACT_DOCUMENT_ADDED","Documento contractual adjuntado",input.title);return version;}
  async documentUrl(id:string,versionId:string){const contract=await this.repository.get(id);if(!contract)throw new NotFoundException("Contrato no encontrado.");const version=(await this.repository.versions(id)).find((item)=>item.id===versionId);if(!version?.storagePath)throw new NotFoundException("Documento contractual no encontrado.");return{url:await this.repository.signedDocumentUrl(version.storagePath),expiresIn:300};}
}
