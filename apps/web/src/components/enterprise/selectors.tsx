function Selector({ label, emptyLabel }: { label: string; emptyLabel: string }) {
  return <label className="enterpriseSelector"><span>{label}</span><select defaultValue=""><option value="">{emptyLabel}</option></select></label>;
}

export function UserSelector() { return <Selector label="Usuario" emptyLabel="Seleccionar usuario" />; }
export function ProjectSelector() { return <Selector label="Proyecto" emptyLabel="Seleccionar proyecto" />; }
export function ClientSelector() { return <Selector label="Cliente" emptyLabel="Seleccionar cliente" />; }

