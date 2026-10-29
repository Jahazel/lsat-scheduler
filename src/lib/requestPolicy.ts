import type { SecurityLogRoute } from "./securityLog";

export type RequestFacts = {
  method: string;
  pathname: string;
  origin: string | null;
  contentType: string | null;
  /** The place's configured site address. Never read from the request's `Host` header. */
  siteUrl: string | undefined;
};

export type ForgedRequestRefusal = {
  status: 403 | 415;
  result: "wrongOrigin" | "noOrigin" | "wrongContentType";
  route: SecurityLogRoute;
};

export type RequestPolicy = { refused?: ForgedRequestRefusal };

export const EXEMPT_ROUTES = [
  { path: "/api/auth/", prefix: true },
  { path: "/api/cron/daily-cleanup", prefix: false },
] as const;

const READS_ONLY = new Set(["GET", "HEAD", "OPTIONS"]);
const EXTRACTION_ROUTES = new Set(["/api/analytics/extract", "/api/practice-test/extract"]);
/** A fetch Server Action sends its encoded arguments as text, or as multipart when they hold a file or FormData. */
const SERVER_ACTION_TYPES = new Set(["text/plain", "multipart/form-data"]);

const ROUTES = new Set([
  "/", "/account", "/admin", "/dashboard", "/dashboard/upload", "/forgot-password", "/legal/ai-disclosure", "/legal/privacy",
  "/legal/terms", "/login", "/onboarding", "/progress", "/reset-password", "/settings", "/signup", "/verify-email",
  "/api/analytics/extract", "/api/practice-test/extract", "/api/students",
]);
const ROUTES_WITH_ID: [prefix: string, template: SecurityLogRoute][] = [
  ["/admin/students/", "/admin/students/[id]"],
  ["/api/students/", "/api/students/[id]"],
];

function routeTemplate(pathname: string): SecurityLogRoute {
  if (ROUTES.has(pathname)) return pathname as SecurityLogRoute;
  for (const [prefix, template] of ROUTES_WITH_ID) {
    const id = pathname.slice(prefix.length);
    if (pathname.startsWith(prefix) && /^[^/]+$/.test(id)) return template;
  }
  return "/other";
}

function acceptedTypes(pathname: string) {
  if (EXTRACTION_ROUTES.has(pathname)) return new Set(["multipart/form-data"]);
  if (pathname.startsWith("/api/")) return new Set(["application/json"]);
  return SERVER_ACTION_TYPES;
}

const mediaType = (contentType: string) => contentType.split(";")[0].trim().toLowerCase();

/** Decides, from the request alone, how the proxy answers it. */
export function requestPolicy({ method, pathname, origin, contentType, siteUrl }: RequestFacts): RequestPolicy {
  if (READS_ONLY.has(method.toUpperCase())) return {};
  if (EXEMPT_ROUTES.some(({ path, prefix }) => (prefix ? pathname.startsWith(path) : pathname === path))) return {};

  const route = routeTemplate(pathname);
  if (origin === null) return { refused: { status: 403, result: "noOrigin", route } };
  const siteOrigin = siteUrl && URL.canParse(siteUrl) ? new URL(siteUrl).origin : undefined;
  if (origin !== siteOrigin) return { refused: { status: 403, result: "wrongOrigin", route } };
  if (contentType === null || !acceptedTypes(pathname).has(mediaType(contentType))) {
    return { refused: { status: 415, result: "wrongContentType", route } };
  }
  return {};
}
