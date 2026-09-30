export interface ActivityItem { id: string; title: string; detail: string; timestamp: string }

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <p className="inlineEmpty">Sin actividad registrada.</p>;
  return <div className="activityFeed">{items.map((item) => <article key={item.id}><span /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.timestamp}</time></article>)}</div>;
}

export function Timeline({ items }: { items: ActivityItem[] }) {
  return <div className="timeline"><ActivityFeed items={items} /></div>;
}

