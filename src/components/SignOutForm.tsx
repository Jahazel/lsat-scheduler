"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { ActionForm } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";

export function SignOutForm(props: ComponentProps<typeof ActionForm>) {
  return <ActionForm data-leaves-page {...props} />;
}

export function SignOutButton(props: Omit<ComponentProps<typeof Button>, "type" | "waiting">) {
  const { pending } = useFormStatus();
  return <Button type="submit" waiting={pending} {...props} />;
}
