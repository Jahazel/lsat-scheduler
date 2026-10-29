import type { SecurityLogRoute } from "./securityLog";

export type RequestFacts = {
  method: string;
  pathname: string;
  search: string;
  origin: string | null;
  contentType: string | null;
  /** The place's configured site address. Never read from the request's `Host` header. */
  siteUrl: string | undefined;
  enforceCsp: boolean;
  development: boolean;
};

export type ForgedRequestRefusal = {
  status: 403 | 415;
  result: "wrongOrigin" | "noOrigin" | "wrongContentType";
  route: SecurityLogRoute;
};

export type ContentSecurityPolicy = {
  header: "Content-Security-Policy" | "Content-Security-Policy-Report-Only";
  value: string;
};

export type RequestPolicy = {
  refused?: ForgedRequestRefusal;
  /** Next.js reads the nonce from this header on the request and puts it on the page's scripts and styles. */
  csp: ContentSecurityPolicy;
  responseHeaders: Record<string, string>;
};

export const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

export const PUBLIC_PAGES = [
  "/", "/legal/ai-disclosure", "/legal/privacy", "/legal/terms",
  "/login", "/signup", "/forgot-password", "/verify-email", "/reset-password",
] as const;
const PUBLIC_PAGE_SET = new Set<string>(PUBLIC_PAGES);

const SIGNED_OUT_PARAM = "signedOut";

export function afterSignOut(path: "/" | "/login") {
  return `${path}?${SIGNED_OUT_PARAM}=1`;
}

const NO_REFERRER_PAGES = new Set(["/verify-email", "/reset-password"]);

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

function forgedRequestRefusal({ method, pathname, origin, contentType, siteUrl }: RequestFacts): ForgedRequestRefusal | undefined {
  if (READS_ONLY.has(method.toUpperCase())) return undefined;
  if (EXEMPT_ROUTES.some(({ path, prefix }) => (prefix ? pathname.startsWith(path) : pathname === path))) return undefined;

  const route = routeTemplate(pathname);
  if (origin === null) return { status: 403, result: "noOrigin", route };
  const siteOrigin = siteUrl && URL.canParse(siteUrl) ? new URL(siteUrl).origin : undefined;
  if (origin !== siteOrigin) return { status: 403, result: "wrongOrigin", route };
  if (contentType === null || !acceptedTypes(pathname).has(mediaType(contentType))) {
    return { status: 415, result: "wrongContentType", route };
  }
  return undefined;
}

function contentSecurityPolicy(enforce: boolean, development: boolean): ContentSecurityPolicy {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // React uses eval in development only, to rebuild server error stacks in the browser.
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`;
  const value = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return { header: enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value };
}

/** Decides, from the request alone, how the proxy answers it. */
export function requestPolicy(facts: RequestFacts): RequestPolicy {
  const csp = contentSecurityPolicy(facts.enforceCsp, facts.development);
  const responseHeaders: Record<string, string> = { ...SECURITY_HEADERS, [csp.header]: csp.value };
  if (NO_REFERRER_PAGES.has(facts.pathname)) responseHeaders["Referrer-Policy"] = "no-referrer";
  if (!READS_ONLY.has(facts.method.toUpperCase()) || !PUBLIC_PAGE_SET.has(facts.pathname)) responseHeaders["Cache-Control"] = "private, no-store";
  if (new URLSearchParams(facts.search).has(SIGNED_OUT_PARAM)) responseHeaders["Clear-Site-Data"] = '"cache"';
  return { refused: forgedRequestRefusal(facts), csp, responseHeaders };
}
