export function PlaceholderPage({ title }: { title: string }) {
  return <section className="page"><div className="page-heading compact"><div><span className="eyebrow">Planned module</span><h1>{title}</h1><p>The architecture boundary is ready; this workflow will be implemented in its scheduled milestone.</p></div></div><div className="empty"><h2>Coming in a later milestone</h2><p>Multi-source collection and universal search are the current implementation priority.</p></div></section>;
}
