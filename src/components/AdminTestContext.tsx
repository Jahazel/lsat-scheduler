"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
interface CurrentWeek {
  week: string;
  exists: boolean;
}
const AdminTestContext = createContext<{
  currentWeek: CurrentWeek | null;
  setCurrentWeek: (week: CurrentWeek | null) => void;
}>({
  currentWeek: null,
  setCurrentWeek: () => {},
});

export function AdminTestProvider({ children }: { children: ReactNode }) {
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  return (
    <AdminTestContext.Provider
      value={{ currentWeek, setCurrentWeek }}
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
