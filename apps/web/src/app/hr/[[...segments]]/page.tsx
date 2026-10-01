import { HrWorkspace } from "@/components/hr/hr-workspace";
import "../../hr.css";
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const{segments=[]}=await params;return <HrWorkspace segments={segments}/>;}
