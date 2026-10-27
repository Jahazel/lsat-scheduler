import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail } from "@/components/signIn/PasswordFormParts";
import { Notice, PreviewHeader, SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { cx } from "@/components/ui/classes";
import { loginNotice } from "@/lib/loginNotice";
import { signInWithGoogle } from "./actions";
import { PasswordLoginForm } from "./PasswordLoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, notice: noticeKey } = await searchParams;
  const notice = loginNotice({ error, notice: noticeKey });
  return (
    <SignInFrame title="Log in to DrillMap" lead="Your plan for this week is ready." preview={<TodayPreview />}>
      {notice && notice.tone !== "success" && <Notice notice={notice} />}
      <form action={signInWithGoogle}>
        <GoogleButton look="light" />
      </form>
      <OrWithEmail />
      <PasswordLoginForm urlNotice={notice?.tone === "success" ? notice : null} />
      <SwitchPageLink question="New to DrillMap?" href="/signup" label="Sign up" />
    </SignInFrame>
  );
}


const TODAY = [
  { label: "Flaw questions · 12 drills", minutes: "35 min", done: true },
  { label: "Weaken · timed section", minutes: "35 min", done: false },
  { label: "Reading comp · 2 passages", minutes: "1 h", done: false },
];

function TodayPreview() {
  return (
    <>
      <PreviewHeader label="Thursday · Today" detail="2 h 10 min" />
      <ul className="flex flex-col gap-3">
        {TODAY.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            {row.done ? (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-pill bg-ink">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="stroke-chalk" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5.2l2 2 4-4.4" />
                </svg>
              </span>
            ) : (
              <span className="size-4 shrink-0 rounded-pill border-[1.5px] border-fog" />
            )}
            <span className={cx("grow text-body leading-[20px]", row.done ? "text-smoke line-through" : "text-ink")}>{row.label}</span>
            <span className={cx("font-mono text-mono", row.done ? "text-fog" : "text-smoke")}>{row.minutes}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <div className="h-2 rounded-pill bg-vellum-line">
          <div className="h-full w-1/3 rounded-pill bg-accent" />
        </div>
        <p className="text-small font-medium text-accent">2 remaining today</p>
      </div>
    </>
  );
}
