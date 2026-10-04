import { ProjectMonitoringSlot } from "@/components/monitoring/embedded";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <><OperationsWorkspace section={segments[0] ? "project" : "projects"} detailId={segments[0]}/>{segments[0] ? <ProjectMonitoringSlot projectId={segments[0]}/> : null}</>; }
