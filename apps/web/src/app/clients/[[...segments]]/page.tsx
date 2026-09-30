import { Client360 } from "@/components/clients/client-360";
import { ClientHub } from "@/components/clients/client-hub";
import { NewClientWizard } from "@/components/clients/new-client-wizard";
import { ModulePage } from "@/components/module-page";
import { notFound } from "next/navigation";

const clientSections = new Set(["contacts", "contracts", "services", "renewals"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  if (!segments.length) return <ClientHub />;
  if (segments[0] === "new") return <NewClientWizard />;
  if (segments[0] === "360") return <ClientHub />;
  if (clientSections.has(segments[0]!)) return <ModulePage pathname={`/clients/${segments[0]}`} />;
  if (!uuidPattern.test(segments[0]!)) notFound();
  return <Client360 id={segments[0]!} initialTab={segments[1]} />;
}
