import { Injectable,ServiceUnavailableException } from "@nestjs/common";

export abstract class VaultSecretProvider{
  abstract readonly name:string;
  abstract readonly configured:boolean;
  abstract reveal(encryptedReference:string):Promise<string>;
}
@Injectable()
export class DeferredVaultSecretProvider extends VaultSecretProvider{
  readonly name="NOT_CONFIGURED";readonly configured=false;
  async reveal(_encryptedReference:string):Promise<string>{throw new ServiceUnavailableException("No existe un proveedor criptográfico/Vault configurado. El secreto no fue revelado.");}
}
@Injectable()
export class SecurityProviderStatus{
  snapshot(){return{vault:process.env.SECURITY_VAULT_PROVIDER||"NOT_CONFIGURED",secretScan:process.env.SECURITY_SECRET_SCAN_PROVIDER||"NOT_CONFIGURED",sast:process.env.SECURITY_SAST_PROVIDER||"NOT_CONFIGURED",sca:process.env.SECURITY_SCA_PROVIDER||"NOT_CONFIGURED",dast:process.env.SECURITY_DAST_PROVIDER||"NOT_CONFIGURED",backup:process.env.SECURITY_BACKUP_PROVIDER||"NOT_CONFIGURED",waf:process.env.SECURITY_WAF_PROVIDER||"NOT_CONFIGURED",malware:process.env.SECURITY_MALWARE_PROVIDER||"NOT_CONFIGURED"};}
}
