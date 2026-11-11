import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_SECTIONS } from "./sections";

export default function PrivacyPage() {
  return <LegalPage id="privacy" title="Privacy Policy" dateLine="Last updated: November 10, 2026" sections={PRIVACY_SECTIONS} />;
}
