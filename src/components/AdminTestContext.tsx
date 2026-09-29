"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AnalyticsExtractedRow } from "@/lib/types";
import AnalyticsUploader from "@/app/dashboard/AnalyticsUploader";

export interface SampleDraft {
  rows: AnalyticsExtractedRow[];
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

export function SampleReviewSlot({
  children,
  week,
  hasSchedule,
}: {
  children: ReactNode;
  week: string;
  hasSchedule: boolean;
}) {
  const { sample, setSample, setCurrentWeek } = useAdminTest();
  useEffect(() => {
    setCurrentWeek({ week, exists: hasSchedule });
  }, [week, hasSchedule, setCurrentWeek]);
  return sample ? (
    <AnalyticsUploader
      key={sample.extractedAt}
      sample={sample}
      onSampleDone={() => setSample(null)}
    />
  ) : (
    children
  );
}
