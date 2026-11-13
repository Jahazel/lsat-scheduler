export type IconName = "week" | "upload" | "progress" | "settings" | "account" | "logout" | "chevron" | "check" | "clock" | "card" | "admin" | "calendar" | "flag" | "info" | "warning";

const PATHS: Record<IconName, React.ReactNode> = {
  warning: <><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.5" /><path d="M12 17.25v.01" /></>,
  week: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 14v3a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3" /></>,
  progress: <><path d="M4 20h16" /><path d="M7 16v-4M12 16V7M17 16v-6" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  account: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></>,
  logout: <><path d="M14 4.5h3a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-3" /><path d="M10 8l-4 4 4 4M6 12h9" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15h3" /></>,
  admin: <><path d="M12 3.5 19 6v5.5c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-2.5Z" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.2" /></>,
  flag: <><path d="M5.5 21V4.5M5.5 5h11l-2 4 2 4h-11" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
};

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
