const CONTENT_WIDTH = "w-full md:w-[min(1120px,calc(100%-48px))]";

export function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex w-full flex-col items-center">
      <div aria-hidden="true" className={`section-guides pointer-events-none absolute inset-y-0 left-1/2 -z-10 -translate-x-1/2 ${CONTENT_WIDTH}`} />
      {children}
    </div>
  );
}

export function GapBand() {
  return <div aria-hidden="true" className="section-band relative h-14 w-full shrink-0 md:h-32" />;
}

export function SectionLabel({ id, number, children }: { id: string; number: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className={`relative mx-auto border-b border-dashed border-ink/14 py-3 font-mono text-mono text-ink before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-vellum-line md:px-6 md:py-[14px] ${CONTENT_WIDTH}`}
    >
      <span aria-hidden="true" className="mr-1.5 text-fog">[{number}]</span>
      {children}
    </h2>
  );
}
