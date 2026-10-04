import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SourceControlProvider { configured():boolean; connectRepository(input:unknown):Promise<unknown>; listBranches(repository:string):Promise<unknown[]>; listCommits(repository:string):Promise<unknown[]>; listPullRequests(repository:string):Promise<unknown[]>; }
export interface CIProvider { configured():boolean; getBuilds(project:string):Promise<unknown[]>; triggerBuild(project:string):Promise<unknown>; }
export interface DeploymentProvider { configured():boolean; listDeployments(project:string):Promise<unknown[]>; triggerDeployment(project:string,environment:string):Promise<unknown>; rollback(reference:string):Promise<unknown>; }

const unavailable=(name:string)=>Promise.reject(new Error(`${name} no configurado.`));

@Injectable()
export class GitHubSourceControlProvider implements SourceControlProvider {
  configured(){return Boolean(process.env.GITHUB_APP_ID&&process.env.GITHUB_PRIVATE_KEY);}
  connectRepository(input:unknown){return this.configured()?Promise.resolve(input):unavailable("GitHub");}
  listBranches(repository:string){void repository;return this.configured()?Promise.resolve([]):unavailable("GitHub");}
  listCommits(repository:string){void repository;return this.configured()?Promise.resolve([]):unavailable("GitHub");}
  listPullRequests(repository:string){void repository;return this.configured()?Promise.resolve([]):unavailable("GitHub");}
  verifyWebhook(payload:Buffer,signature?:string){const secret=process.env.GITHUB_WEBHOOK_SECRET;if(!secret||!signature)return false;const expected=Buffer.from(`sha256=${createHmac("sha256",secret).update(payload).digest("hex")}`);const received=Buffer.from(signature);return expected.length===received.length&&timingSafeEqual(expected,received);}
}

@Injectable()
export class GitHubActionsProvider implements CIProvider {
  configured(){return Boolean(process.env.GITHUB_APP_ID&&process.env.GITHUB_PRIVATE_KEY);}
  getBuilds(project:string){void project;return this.configured()?Promise.resolve([]):unavailable("GitHub Actions");}
  triggerBuild(project:string){return this.configured()?Promise.resolve({project,status:"QUEUED"}):unavailable("GitHub Actions");}
}

@Injectable()
export class RenderDeploymentProvider implements DeploymentProvider {
  configured(){return Boolean(process.env.RENDER_API_KEY);}
  listDeployments(project:string){void project;return this.configured()?Promise.resolve([]):unavailable("Render");}
  triggerDeployment(project:string,environment:string){return this.configured()?Promise.resolve({project,environment,status:"QUEUED"}):unavailable("Render");}
  rollback(reference:string){return this.configured()?Promise.resolve({reference,status:"REQUESTED"}):unavailable("Render");}
}
