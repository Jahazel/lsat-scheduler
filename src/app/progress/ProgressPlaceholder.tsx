"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export default function ProgressPlaceholder({ list, week }: { list: ReactNode; week: ReactNode }) {
  return useSearchParams().has("week") ? week : list;
}
