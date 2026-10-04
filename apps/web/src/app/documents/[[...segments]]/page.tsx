import { DocumentsWorkspace } from "@/components/documents/documents-workspace";
import "../../documents.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <DocumentsWorkspace segments={segments}/>; }
