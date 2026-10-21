"use client";

import { useState } from "react";
import { useAdminTest, type SampleDraft } from "@/components/AdminTestContext";
import { startReview } from "@/lib/analyticsReview";
import { reviewPracticeTest } from "@/lib/practiceTestResult";
import type { NextWeekBasis } from "@/lib/weeklyUpload";
import { confirmWeeklyUpload } from "./actions";
import WeeklyCheck, { type CheckSource } from "./WeeklyCheck";
import WeeklyUpload, { type WeeklyUploadRead } from "./WeeklyUpload";

function sampleRead(sample: SampleDraft, basis: NextWeekBasis, currentScore: number): WeeklyUploadRead {
  const review = basis.hadPracticeTest ? reviewPracticeTest(sample.sections) : null;
  return {
    currentScore,
    analytics: startReview(sample.rows, { source: "admin_sample", extractedAt: sample.extractedAt }),
    lrRead: sample.rows.filter((row) => row.category !== "passage"),
    files: {},
    practiceTest: review?.ok
      ? { result: review.result, readings: sample.sections, picks: [], extractedAt: sample.extractedAt }
      : null,
  };
}

export default function WeeklyUploadFlow({ basis, initialScore, confirm = confirmWeeklyUpload }: {
  basis: NextWeekBasis;
  initialScore: number;
  confirm?: typeof confirmWeeklyUpload;
}) {
  const { sample, setSample } = useAdminTest();
  const [checking, setChecking] = useState<{ read: WeeklyUploadRead; source: CheckSource; key: string } | null>(null);
  const [reviewedSample, setReviewedSample] = useState<SampleDraft | null>(null);
  if (sample && sample !== reviewedSample) {
    setReviewedSample(sample);
    setChecking({ read: sampleRead(sample, basis, initialScore), source: "admin_sample", key: sample.extractedAt });
  }

  function back() {
    setChecking(null);
    if (checking?.source === "admin_sample") setSample(null);
  }

  return (
    <>
      <div hidden={checking !== null}>
        <WeeklyUpload
          basis={basis}
          initialScore={initialScore}
          onCheckValues={(read) => {
            setChecking({ read, source: "7sage_screenshot", key: `${Date.now()}` });
            window.scrollTo(0, 0);
          }}
        />
      </div>
      {checking && (
        <WeeklyCheck
          key={checking.key}
          basis={basis}
          read={checking.read}
          source={checking.source}
          onBack={back}
          onConfirm={confirm}
          onSent={() => setSample(null)}
        />
      )}
    </>
  );
}
