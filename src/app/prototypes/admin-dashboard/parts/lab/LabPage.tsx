"use client";

import type { Student } from "../data";
import { LabSidebar } from "./Sidebar";
import { decodeDraft, encodeDraft, type LabDraft } from "./model";
import { startFor, useLab } from "./parts";

export function LabPage({ from, link, onLink }: { from: Student | undefined; link: string; onLink: (lab: string) => void; }) {
  const lab = useLab(from ? startFor(from) : (decodeDraft(link) ?? startFor(undefined)), (draft: LabDraft) => onLink(encodeDraft(draft)));
  return <LabSidebar lab={lab} />;
}
