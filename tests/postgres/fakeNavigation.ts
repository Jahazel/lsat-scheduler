import { vi } from "vitest";

export const redirect = (path: string): never => {
  throw new Error(`redirect:${path}`);
};

export const notFound = (): never => {
  throw new Error("not-found");
};

export function unstable_rethrow(error: unknown) {
  if (error instanceof Error && /^(redirect:|not-found$)/.test(error.message)) throw error;
}

export const useRouter = () => ({ refresh: vi.fn(), push: vi.fn() });
export const usePathname = () => "/dashboard";
