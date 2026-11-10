export type LegalPageId = "terms" | "privacy" | "ai-disclosure";

export const PAGE_IDS: LegalPageId[] = ["terms", "privacy", "ai-disclosure"];
export const isPageId = (value: string | undefined): value is LegalPageId => PAGE_IDS.includes(value as LegalPageId);
export const PAGE_LABELS: Record<LegalPageId, string> = { terms: "Terms of Service", privacy: "Privacy Policy", "ai-disclosure": "AI disclosure" };

export type DatasetName = "demo" | "worst";
export const isDatasetName = (value: string | undefined): value is DatasetName => value === "demo" || value === "worst";

export type AuthState = "out" | "in";
export const isAuthState = (value: string | undefined): value is AuthState => value === "out" || value === "in";
