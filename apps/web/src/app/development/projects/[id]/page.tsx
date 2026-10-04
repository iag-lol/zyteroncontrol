import { DevelopmentProjectView } from "@/components/development/development-project-view";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <DevelopmentProjectView projectId={id}/>;}
