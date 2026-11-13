export type NavIconName = "week" | "upload" | "progress" | "settings" | "chevron" | "check" | "account" | "logout" | "flag";

const PATHS: Record<NavIconName, string> = {
  week: "M7 5.5h10a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V8A2.5 2.5 0 0 1 7 5.5ZM4.5 10h15",
  upload: "M12 18.5V6M7 11l5-5 5 5",
  progress: "M4.5 17.5 10 12l3 3 6.5-6.5",
  settings: "M4.5 8.5h2.9M10.6 8.5h8.9M4.5 15.5h8.9M16.6 15.5h2.9M10.6 8.5a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0ZM16.6 15.5a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z",
  chevron: "m7.2 9.6 4.8 4.8 4.8-4.8",
  check: "m4.8 12 4.8 4.8 9.6-9.6",
  account: "M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5",
  logout: "M14 4.5h3a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-3M10 8l-4 4 4 4M6 12h9",
  flag: "M5.5 21V4.5M5.5 5h11l-2 4 2 4h-11",
};

const STROKE: Partial<Record<NavIconName, number>> = { chevron: 1.8, check: 1.8, account: 1.6, logout: 1.6, flag: 1.6 };

export function NavIcon({ name, className = "size-5" }: { name: NavIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE[name] ?? 1.4} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
