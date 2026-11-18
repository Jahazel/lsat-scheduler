"use client";

import { useState } from "react";
import type { ScanningOff } from "@/lib/scanSpending";
import type { WeeklyUploadBasis } from "@/lib/weeklyUploadPreview";
import type { confirmWeeklyUpload } from "./actions";
import WeeklyCheck from "./WeeklyCheck";
import WeeklyUpload, { type WeeklyUploadRead } from "./WeeklyUpload";

export default function WeeklyUploadFlow({ basis, initialScore, scanningOff, confirm }: {
  basis: WeeklyUploadBasis;
  initialScore: number;
  scanningOff?: ScanningOff;
  confirm: typeof confirmWeeklyUpload;
}) {
  const [checking, setChecking] = useState<{ read: WeeklyUploadRead; key: string } | null>(null);

  return (
    <>
      <div hidden={checking !== null}>
        <WeeklyUpload
          basis={basis}
          initialScore={initialScore}
          scanningOff={scanningOff}
          onCheckValues={(read) => {
            setChecking({ read, key: `${Date.now()}` });
            window.scrollTo(0, 0);
          }}
        />
      </div>
      {checking && (
        <WeeklyCheck
          key={checking.key}
          basis={basis}
          read={checking.read}
          onBack={() => setChecking(null)}
          onConfirm={confirm}
        />
      )}
    </>
  );
}
