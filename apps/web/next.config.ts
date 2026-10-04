import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";

loadEnvConfig(resolve(process.cwd(), "../.."));

const origin=(value?:string)=>{try{return value?new URL(value).origin:undefined;}catch{return undefined;}};
const connectSources=["'self'",origin(process.env.NEXT_PUBLIC_API_URL),origin(process.env.NEXT_PUBLIC_SUPABASE_URL),process.env.NODE_ENV!=="production"?"ws:":undefined].filter(Boolean).join(" ");
const csp=["default-src 'self'",`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV!=="production"?" 'unsafe-eval'":""}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:",`connect-src ${connectSources}`,"font-src 'self' data:","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'",process.env.NODE_ENV==="production"?"upgrade-insecure-requests":""].filter(Boolean).join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@zyteron/contracts"],
  poweredByHeader:false,
  productionBrowserSourceMaps:false,
  async headers(){return[{source:"/(.*)",headers:[{key:"Content-Security-Policy",value:csp},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},...(process.env.NODE_ENV==="production"?[{key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}]:[])]}];},
};

export default nextConfig;
