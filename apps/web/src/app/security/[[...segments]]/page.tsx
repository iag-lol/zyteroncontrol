import { SecurityWorkspace } from "@/components/security/security-workspace";
import "../../security.css";
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const{segments=[]}=await params;return <SecurityWorkspace segments={segments}/>;}
