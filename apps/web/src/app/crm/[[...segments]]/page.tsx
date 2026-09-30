import { ModulePage } from "@/components/module-page";
import { CommercialPipeline } from "@/components/commercial-pipeline";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; const pathname = `/crm${segments.length ? `/${segments.join("/")}` : ""}`; return pathname === "/crm/pipeline" ? <CommercialPipeline /> : <ModulePage pathname={pathname} />; }
