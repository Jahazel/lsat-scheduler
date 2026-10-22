"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SectionReview } from "@/lib/practiceTestResult";
import type { AnalyticsExtractedRow } from "@/lib/types";

export interface SampleDraft {
  rows: AnalyticsExtractedRow[];
  sections: SectionReview[];
  extractedAt: string;
}
const AdminTestContext = createContext<{
  currentWeek: { week: string; exists: boolean } | null;
  setCurrentWeek: (week: { week: string; exists: boolean } | null) => void;
  sample: SampleDraft | null;
  setSample: (sample: SampleDraft | null) => void;
}>({
  sample: null,
  setSample: () => {},
  currentWeek: null,
  setCurrentWeek: () => {},
});

export function AdminTestProvider({ children }: { children: ReactNode }) {
  const [currentWeek, setCurrentWeek] = useState<{
    week: string;
    exists: boolean;
  } | null>(null);
  const [sample, setSample] = useState<SampleDraft | null>(null);
  return (
    <AdminTestContext.Provider
      value={{ sample, setSample, currentWeek, setCurrentWeek }}
    >
      {children}
    </AdminTestContext.Provider>
  );
}

export const useAdminTest = () => useContext(AdminTestContext);

export function CurrentWeekReport({ week, hasSchedule }: { week: string; hasSchedule: boolean }) {
  const { setCurrentWeek } = useAdminTest();
  useEffect(() => {
    setCurrentWeek({ week, exists: hasSchedule });
  }, [week, hasSchedule, setCurrentWeek]);
  return null;
}
