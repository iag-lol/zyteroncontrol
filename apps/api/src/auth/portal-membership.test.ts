import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportRepository } from '../support/support.repository.js';
import { DocumentsRepository } from '../documents/documents.repository.js';
const state=vi.hoisted(()=>({membership:{client_id:'tenant-a',contact_id:'contact-a'} as {client_id:string;contact_id:string}|null,settings:{enabled:true,tickets_visible:true,documents_visible:true},error:null as Error|null,filters:[] as [string,string,unknown][]}));
vi.mock('../domain/server-supabase.js',()=>({createServerSupabase:()=>({from:(table:string)=>{const chain={select:()=>chain,eq:(key:string,value:unknown)=>{state.filters.push([table,key,value]);return chain;},maybeSingle:async()=>({data:table==='client_portal_users'?state.membership:state.settings,error:state.error})};return chain;}}),pageBounds:()=>({from:0,to:25})}));
describe.each([{name:'Soporte',repository:()=>new SupportRepository(),visibility:'tickets_visible'},{name:'Documentos',repository:()=>new DocumentsRepository(),visibility:'documents_visible'}])('$name current membership',({repository,visibility})=>{
 beforeEach(()=>{state.membership={client_id:'tenant-a',contact_id:'contact-a'};state.settings={enabled:true,tickets_visible:true,documents_visible:true};state.error=null;state.filters=[];});
 it('checks user, active status and selected organization on every lookup',async()=>{
  const repo=repository();await expect(repo.portalIdentity('trusted-user','tenant-a')).resolves.toEqual({clientId:'tenant-a',contactId:'contact-a'});
  expect(state.filters).toContainEqual(['client_portal_users','auth_user_id','trusted-user']);expect(state.filters).toContainEqual(['client_portal_users','status','ACTIVE']);expect(state.filters).toContainEqual(['client_portal_users','client_id','tenant-a']);
  state.membership=null;await expect(repo.portalIdentity('trusted-user','tenant-a')).resolves.toBeNull();
 });
 it('denies a disabled portal',async()=>{state.settings.enabled=false;await expect(repository().portalIdentity('trusted-user','tenant-a')).resolves.toBeNull();});
 it('denies resources whose publication setting is disabled',async()=>{state.settings={...state.settings,[visibility]:false};await expect(repository().portalIdentity('trusted-user','tenant-a')).resolves.toBeNull();});
 it('fails closed on repository errors',async()=>{state.error=new Error('database unavailable');await expect(repository().portalIdentity('trusted-user','tenant-a')).rejects.toThrow('database unavailable');});
});
