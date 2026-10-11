import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const cookieName='__Host-zyteron-flow';
export function error(message:string,status=503){return NextResponse.json({error:{code:'FLOW_NOT_AVAILABLE',message,request_id:crypto.randomUUID()}},{status,headers:{'cache-control':'private, no-store'}});}
export function validOrigin(request:Request){const configured=process.env.PORTAL_PUBLIC_ORIGIN;return Boolean(configured&&request.headers.get('origin')===new URL(configured).origin);}
export async function grantToken(){return(await cookies()).get(cookieName)?.value??'';}
export async function setGrant(response:NextResponse,grant:{secret:string;expiresAt:string}){if(!/^[A-Za-z0-9_-]{43}$/.test(grant.secret))throw new Error('INVALID_GRANT');response.cookies.set(cookieName,grant.secret,{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:Math.min(1800,Math.max(0,Math.floor((new Date(grant.expiresAt).getTime()-Date.now())/1000)))});}
export async function flowBackend(action:string,body:Record<string,unknown>){const base=process.env.ZYTERON_API_URL;if(!base)throw new Error('BACKEND_NOT_CONFIGURED');const origin=new URL(base);if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||!['/api','/api/'].includes(origin.pathname)||origin.port||!process.env.ZYTERON_API_HOST||origin.hostname!==process.env.ZYTERON_API_HOST)throw new Error('BACKEND_NOT_ALLOWED');const allowed=['open','view','start','refresh','return','registration-return','receipt'];if(!allowed.includes(action))throw new Error('ACTION_NOT_ALLOWED');return fetch(base.replace(/\/$/,'')+'/public/flow/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});}

export function clearGrant(response:NextResponse){response.cookies.set(cookieName,'',{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:0});}
