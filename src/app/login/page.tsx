import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { TodayPreview } from "@/components/signIn/TodayPreview";
import { loginNotice } from "@/lib/loginNotice";
import { LoginForms } from "./LoginForms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, notice, code } = await searchParams;
  return (
    <SignInFrame title="Log in to DrillMap" lead="Your plan for this week is ready." preview={<TodayPreview />}>
      <LoginForms urlNotice={loginNotice({ error, notice, code })} />
      <SwitchPageLink question="New to DrillMap?" href="/signup" label="Sign up" />
    </SignInFrame>
  );
}
