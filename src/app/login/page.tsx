import Link from "next/link";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail, SubmitButton } from "@/components/signIn/PasswordFormParts";
import { Notice, SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { TodayPreview } from "@/components/signIn/TodayPreview";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, cx } from "@/components/ui/classes";
import { loginNotice } from "@/lib/loginNotice";
import { logInWithPassword, signInWithGoogle } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, notice: noticeKey } = await searchParams;
  const notice = loginNotice({ error, notice: noticeKey });
  return (
    <SignInFrame title="Log in to DrillMap" lead="Your plan for this week is ready." preview={<TodayPreview />}>
      {notice?.place === "aboveGoogle" && <Notice notice={notice} />}
      <form action={signInWithGoogle}>
        <GoogleButton look="light" />
      </form>
      <OrWithEmail />
      <form action={logInWithPassword} className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {notice?.place === "aboveEmail" && <Notice notice={notice} />}
          <TextInput label="Email" name="email" type="email" autoComplete="email" required />
          <TextInput
            label="Password"
            labelAside={<Link href="/forgot-password" className={cx("rounded-xs text-small font-medium text-accent hover:text-ink", FOCUS)}>Forgot password?</Link>}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitButton label="Log in" />
      </form>
      <SwitchPageLink question="New to DrillMap?" href="/signup" label="Sign up" />
    </SignInFrame>
  );
}
