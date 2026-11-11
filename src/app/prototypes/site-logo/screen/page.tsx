import { notFound } from "next/navigation";
import "../proto.css";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import SignedOutTopBar from "@/components/nav/SignedOutTopBar";
import { LogoSwap } from "../logo/LogoSwap";
import { Bars } from "../scenes/Bars";
import { Footers } from "../scenes/Footer";
import { Icons } from "../scenes/Icons";
import { readView } from "../view";
import { ProtoFlow } from "./ProtoFlow";
import { StillMotion } from "./StillMotion";

export default async function SiteLogoScreen({ searchParams }: PageProps<"/prototypes/site-logo/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const view = readView(await searchParams);
  return (
    <div data-proto-scene>
      <StillMotion on={view.reducedMotion} />
      <LogoSwap />
      <ProtoFlow />
      {view.scene === "bars" && <Bars landingBar={<SignedOutTopBar />} worst={view.worst} />}
      {view.scene === "login" && (await LoginPage({ searchParams: Promise.resolve(view.worst ? { error: "AccessDenied" } : {}) } as PageProps<"/login">))}
      {view.scene === "signup" && <SignupPage />}
      {view.scene === "footer" && <Footers worst={view.worst} />}
      {view.scene === "icons" && <Icons />}
    </div>
  );
}
