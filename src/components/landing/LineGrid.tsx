const CONTENT_WIDTH = "w-full md:w-[min(1120px,calc(100%-48px))]";

export function LineGrid({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="line-grid relative isolate flex w-full flex-col items-center">
      <div aria-hidden="true" className="line-grid-dots pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="line-grid-lines line-grid-edges pointer-events-none -z-10" />
      {hero}
      <div className="relative flex w-full flex-col items-center px-5 md:px-0">
        <div aria-hidden="true" className="line-grid-lines line-grid-middle pointer-events-none -z-10" />
        {children}
      </div>
    </div>
  );
}

export function GridGap() {
  return <div aria-hidden="true" className="h-14 w-full shrink-0 md:h-32" />;
}

export function SectionLabel({ id, number, children }: { id: string; number: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={`relative mx-auto flex py-3 font-mono text-mono text-ink md:px-6 md:py-[14px] ${CONTENT_WIDTH}`}>
      <span aria-hidden="true" className="line-grid-rule absolute top-0 left-1/2 w-screen -translate-x-1/2" />
      <span aria-hidden="true" className="line-grid-rule absolute bottom-0 left-0 w-full" />
      <span aria-hidden="true" className="mr-1.5 shrink-0 text-fog">[{number}]</span>
      <span className="min-w-0">{children}</span>
    </h2>
  );
}
