import "./auth.css";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";

export async function AuthScreen({ page, loginParams = {} }: { page: "login" | "signup"; loginParams?: { error?: string; notice?: string } }) {
  return (
    <div data-auth>
      {page === "login" ? await LoginPage({ searchParams: Promise.resolve(loginParams) } as PageProps<"/login">) : <SignupPage />}
    </div>
  );
}
