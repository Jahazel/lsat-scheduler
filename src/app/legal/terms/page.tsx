import { LegalPage } from "@/components/legal/LegalPage";
import { termsSections } from "./sections";

export default function TermsPage() {
  return <LegalPage id="terms" title="Terms of Service" dateLine="Effective date: November 9, 2026" sections={termsSections()} />;
}
