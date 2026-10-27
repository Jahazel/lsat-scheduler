import { PASSWORD_LOGIN_NOTICES } from "./loginNotice";

export const CURRENT_PASSWORD_MESSAGES = {
  "wrong-password": "That's not your current password. Try again.",
  paused: PASSWORD_LOGIN_NOTICES.paused.text,
} as const;
