"use client";

import { createContext, useContext } from "react";
import type { LegalPage } from "./content";
import type { LegalPageId } from "./pages";

export type ProtoView = { page: LegalPage; pages: LegalPage[] };
export const ProtoViewContext = createContext<ProtoView | null>(null);
export function useProtoView() {
  const view = useContext(ProtoViewContext);
  if (!view) throw new Error("useProtoView needs the prototype stage");
  return view;
}

export const goToPage = (page: LegalPageId, section?: string) => parent.postMessage({ type: "go", page, section }, location.origin);
export function setAddress(section: string | null) {
  history.replaceState(null, "", section ? `#${section}` : location.pathname + location.search);
  parent.postMessage({ type: "address", section }, location.origin);
}
