export function CheckEmailTips({ linkLife }: { linkLife: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-vellum p-5">
      <p className="flex items-start gap-3 text-small leading-[20px] text-ink">
        <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 stroke-smoke" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" />
          <path d="M2.25 4.25L8 8.75l5.75-4.5" />
        </svg>
        No email after a few minutes? Check your spam or junk folder.
      </p>
      <p className="flex items-start gap-3 text-small leading-[20px] text-ink">
        <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 stroke-smoke" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.75V8L10.25 9.5" />
        </svg>
        {linkLife}
      </p>
    </div>
  );
}
