import{CommercialWorkspace}from"@/components/commercial/commercial-workspace";
const sections=new Set(["leads","opportunities","pipeline","follow-ups","quotes","sales","goals","commissions","handoffs"]);
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const{segments=[]}=await params;const segment=segments[0]??"command";const section=(sections.has(segment)?segment:"command")as Parameters<typeof CommercialWorkspace>[0]["section"];return <CommercialWorkspace section={section}/>;}
