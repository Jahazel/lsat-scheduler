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
interface CurrentWeek {
  week: string;
  exists: boolean;
  previewExists: boolean;
}
const AdminTestContext = createContext<{
  currentWeek: CurrentWeek | null;
  setCurrentWeek: (week: CurrentWeek | null) => void;
  sample: SampleDraft | null;
  setSample: (sample: SampleDraft | null) => void;
}>({
  sample: null,
  setSample: () => {},
  currentWeek: null,
  setCurrentWeek: () => {},
});

export function AdminTestProvider({ children }: { children: ReactNode }) {
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
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

export function CurrentWeekReport({ week, hasSchedule, hasPreview = false }: {
  week: string;
  hasSchedule: boolean;
  hasPreview?: boolean;
}) {
  const { setCurrentWeek } = useAdminTest();
  useEffect(() => {
    setCurrentWeek({ week, exists: hasSchedule, previewExists: hasPreview });
  }, [week, hasSchedule, hasPreview, setCurrentWeek]);
  return null;
}
