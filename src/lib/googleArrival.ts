export const ARRIVAL_COOKIE = "drillmap-arrival";

export function noteGoogleArrival() {
  document.cookie = `${ARRIVAL_COOKIE}=google; max-age=600; path=/; samesite=lax`;
}

export function forgetGoogleArrival() {
  document.cookie = `${ARRIVAL_COOKIE}=; max-age=0; path=/; samesite=lax`;
}

export const hasGoogleArrivalNote = () => document.cookie.split("; ").some((cookie) => cookie.startsWith(`${ARRIVAL_COOKIE}=`));
