export type NavIconName = "week" | "progress" | "settings" | "chevron";

const PATHS: Record<NavIconName, string> = {
  week: "M6 3v3M14 3v3M3.5 8h13M5 5h10a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 15 17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z",
  progress: "M3.5 16.5h13M6 13.5V10M10 13.5V6M14 13.5v-5",
  settings: "M4 6h7M15 6h1M4 14h1M9 14h7M13 4v4M7 12v4",
  chevron: "m6 8 4 4 4-4",
};

export function NavIcon({ name, className = "size-5" }: { name: NavIconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
