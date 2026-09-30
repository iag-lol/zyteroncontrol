import { ModulePage } from "@/components/module-page";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <ModulePage pathname={`/monitoring${segments.length ? `/${segments.join("/")}` : ""}`} />; }
