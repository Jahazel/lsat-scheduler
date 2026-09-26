"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { landingPathForRole } from "@/lib/landingPath";

export interface LoginState {
  error?: string;
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  // Redirect directly: a proxy redirect after an action can leave /login in the URL.
  await connectDB();
  const user = await UserModel.findOne({ email });
  redirect(landingPathForRole(user?.role));
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/login" });
}
