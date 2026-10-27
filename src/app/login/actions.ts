"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { WRONG_PASSWORD_PATH } from "@/lib/loginNotice";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/login" });
}

export async function logInWithPassword(formData: FormData) {
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/login" });
  } catch (error) {
    if (error instanceof AuthError) redirect(WRONG_PASSWORD_PATH);
    throw error;
  }
}
