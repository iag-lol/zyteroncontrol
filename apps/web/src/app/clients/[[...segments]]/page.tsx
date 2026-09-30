import { Client360 } from "@/components/clients/client-360";
import { ClientHub } from "@/components/clients/client-hub";
import { NewClientWizard } from "@/components/clients/new-client-wizard";

export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  if (!segments.length) return <ClientHub />;
  if (segments[0] === "new") return <NewClientWizard />;
  return <Client360 id={segments[0]!} initialTab={segments[1]} />;
}
