interface RateRequest{path:string;headers:Record<string,string|string[]|undefined>;ip?:string;}
interface RateResponse{setHeader(name:string,value:string):void;status(code:number):{json(value:Record<string,unknown>):void};}

type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
const positive=(name:string)=>{const value=Number(process.env[name]);return Number.isInteger(value)&&value>0?value:null;};
const rule=(path:string)=>path.includes("/auth/")?positive("RATE_LIMIT_AUTH_PER_MINUTE"):path.includes("/security/vault")?positive("RATE_LIMIT_VAULT_PER_MINUTE"):path.includes("/export")?positive("RATE_LIMIT_EXPORT_PER_MINUTE"):path.includes("/webhook")?positive("RATE_LIMIT_WEBHOOK_PER_MINUTE"):positive("RATE_LIMIT_DEFAULT_PER_MINUTE");

export function securityRateLimit(request:RateRequest,response:RateResponse,next:()=>void){
  const limit=rule(request.path);if(!limit){next();return;}
  // The guard verifies identity after middleware execution, so never trust a
  // caller-supplied identity header here: it would let an attacker rotate the
  // value and evade the pre-authentication limiter.
  const timestamp=Date.now(),windowMs=60000,principal=String(request.ip??"unknown"),category=request.path.includes("/security/vault")?"vault":request.path.includes("/auth/")?"auth":request.path.includes("/export")?"export":request.path.includes("/webhook")?"webhook":"default",key=`${principal}:${category}`;
  let bucket=buckets.get(key);if(!bucket||bucket.resetAt<=timestamp){bucket={count:0,resetAt:timestamp+windowMs};buckets.set(key,bucket);}bucket.count+=1;
  response.setHeader("x-ratelimit-limit",String(limit));response.setHeader("x-ratelimit-remaining",String(Math.max(0,limit-bucket.count)));response.setHeader("x-ratelimit-reset",String(Math.ceil(bucket.resetAt/1000)));
  if(bucket.count>limit){response.setHeader("retry-after",String(Math.ceil((bucket.resetAt-timestamp)/1000)));response.status(429).json({statusCode:429,message:"Demasiadas solicitudes. Intenta nuevamente después del período indicado."});return;}
  if(buckets.size>10000)for(const[currentKey,current]of buckets)if(current.resetAt<=timestamp)buckets.delete(currentKey);
  next();
}
