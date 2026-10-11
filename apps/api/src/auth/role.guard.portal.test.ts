import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthorizationService } from './authorization.service.js';
import { RoleGuard } from './role.guard.js';
import { PUBLIC_ROUTE, REQUIRED_ROLES } from './roles.decorator.js';
const auth=vi.hoisted(()=>({claims:vi.fn()}));
vi.mock('../domain/server-supabase.js',()=>({createServerSupabase:()=>({auth:{getClaims:auth.claims}})}));
function subject(headers:Record<string,string|undefined>){
 const request={headers};
 const reflector={getAllAndOverride:(key:string)=>key===PUBLIC_ROUTE?false:key===REQUIRED_ROLES?['PORTAL_CLIENT']:undefined} as unknown as Reflector;
 const authorization={hasPermissions:vi.fn().mockResolvedValue(true),observe:vi.fn().mockResolvedValue(true)} as unknown as AuthorizationService;
 const context={getHandler:()=>()=>{},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>request})} as unknown as ExecutionContext;
 return{guard:new RoleGuard(reflector,authorization),context,request};
}
describe('verified portal identity headers',()=>{
 beforeEach(()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('AUTH_MODE','supabase');auth.claims.mockResolvedValue({data:{claims:{sub:'trusted-user',aal:'aal1',session_id:'trusted-session',app_metadata:{role:'PORTAL_CLIENT'}}},error:null});});
 afterEach(()=>vi.unstubAllEnvs());
 it('drops attacker tenant/contact/user/AAL/session values when JWT has no tenant',async()=>{
  const {guard,context,request}=subject({authorization:'Bearer valid-token','x-zyteron-client-id':'tenant-b','x-zyteron-contact-id':'contact-b','x-zyteron-user-id':'attacker','x-zyteron-aal':'aal2','x-zyteron-role':'GERENTE_GENERAL','x-zyteron-session-id':'attacker-session'});
  await expect(guard.canActivate(context)).resolves.toBe(true);
  expect(request.headers['x-zyteron-client-id']).toBeUndefined();expect(request.headers['x-zyteron-contact-id']).toBeUndefined();
  expect(request.headers['x-zyteron-user-id']).toBe('trusted-user');expect(request.headers['x-zyteron-role']).toBe('PORTAL_CLIENT');expect(request.headers['x-zyteron-aal']).toBe('aal1');expect(request.headers['x-zyteron-session-id']).toBe('trusted-session');
 });
 it('uses verified app metadata instead of caller selectors',async()=>{
  auth.claims.mockResolvedValue({data:{claims:{sub:'trusted-user',aal:'aal1',session_id:'trusted-session',app_metadata:{role:'PORTAL_CLIENT',client_id:'tenant-a',contact_id:'contact-a'}}},error:null});
  const {guard,context,request}=subject({authorization:'Bearer valid-token','x-zyteron-client-id':'tenant-b','x-zyteron-contact-id':'contact-b'});
  await guard.canActivate(context);expect(request.headers['x-zyteron-client-id']).toBe('tenant-a');expect(request.headers['x-zyteron-contact-id']).toBe('contact-a');
 });
 it('never accepts user_metadata as role or tenant authority',async()=>{
  auth.claims.mockResolvedValue({data:{claims:{sub:'trusted-user',session_id:'trusted-session',user_metadata:{role:'PORTAL_CLIENT',client_id:'tenant-b'},app_metadata:{}}},error:null});
  const {guard,context}=subject({authorization:'Bearer valid-token','x-zyteron-role':'PORTAL_CLIENT'});await expect(guard.canActivate(context)).rejects.toThrow('rol interno válido');
 });
});
