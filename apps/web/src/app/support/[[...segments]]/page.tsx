import { SupportWorkspace } from "@/components/support/support-workspace";
import "../../support.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <SupportWorkspace segments={segments} />; }
