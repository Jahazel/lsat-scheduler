import { useEffect, useRef } from "react";
import {
  onboardingDraft,
  restoreOnboardingDraft,
  savedAnswers,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";

// Tab storage, so a closed tab or a signed-out browser keeps no scores. Every
// call is wrapped: the wizard works as before when storage is blocked.
function readDraft(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, state: WizardState) {
  try {
    if (savedAnswers(state)) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(onboardingDraft(state)));
  } catch {}
}

// Keeps the wizard's answers across a reload, per signed-in account.
export function useOnboardingDraft(
  accountId: string,
  state: WizardState,
  dispatch: (action: WizardAction) => void,
  scanningOff: boolean,
) {
  const key = `drillmap:onboardingDraft:${accountId}`;
  const firstState = useRef(state);

  useEffect(() => {
    const restored = restoreOnboardingDraft(readDraft(key));
    if (!restored) return;
    const input = scanningOff ? wizardReducer(restored, { type: "chooseInput", input: "typed", at: new Date() }) : restored;
    dispatch({ type: "restored", state: input });
  }, [key, scanningOff, dispatch]);

  useEffect(() => {
    if (state !== firstState.current) writeDraft(key, state);
  }, [key, state]);
}
